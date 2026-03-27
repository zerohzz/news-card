#!/usr/bin/env node

/**
 * Autoresearch v2 eval runner for news-card skill.
 * Renders sample digest → opens in Playwright → measures DOM layout → scores 5 density evals.
 *
 * Usage: node eval-runner.js [--run-id N]
 * Output: JSON with pass/fail for each eval
 */

import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const SKILL_DIR = join(PROJECT_ROOT, 'skills', 'news-card');
const SAMPLE_DIGEST = join(SKILL_DIR, 'examples', 'sample-digest.json');
const TEMPLATES_DIR = join(SKILL_DIR, 'templates');
const RENDER_SCRIPT = join(SKILL_DIR, 'scripts', 'lib', 'render-html.js');

const args = process.argv.slice(2);
const runIdIdx = args.indexOf('--run-id');
const runId = runIdIdx !== -1 ? args[runIdIdx + 1] : Date.now().toString();

const slidesDir = join(PROJECT_ROOT, 'autoresearch-news-card-v2', `run-${runId}`, 'slides');

const results = {
  run_id: runId,
  evals: [],
  total_pass: 0,
  total_evals: 5,
  pass_rate: 0,
};

function addEvalResult(name, question, passed, detail, error) {
  results.evals.push({ name, question, passed, detail: detail || null, error: error || null });
  if (passed) results.total_pass++;
}

// === Pipeline: Render HTML ===
console.error(`[eval] Rendering HTML to ${slidesDir}...`);
let renderOk = false;
try {
  mkdirSync(slidesDir, { recursive: true });
  execSync(
    `node "${RENDER_SCRIPT}" --input "${SAMPLE_DIGEST}" --templates "${TEMPLATES_DIR}" --output "${slidesDir}"`,
    { stdio: ['pipe', 'pipe', 'pipe'], cwd: PROJECT_ROOT }
  );
  renderOk = true;
} catch (err) {
  console.error(`[eval] Render failed: ${err.stderr?.toString() || err.message}`);
}

if (!renderOk) {
  // All evals fail if render fails
  for (let i = 0; i < 5; i++) {
    addEvalResult(`Eval ${i + 1}`, 'N/A', false, null, 'Render pipeline failed');
  }
  results.pass_rate = 0;
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

// === Open Playwright for DOM measurements ===
console.error('[eval] Launching Playwright for DOM measurements...');

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 2,
});

// Block Google Fonts to prevent hangs
await context.route('**/*fonts.googleapis.com/**', (route) => route.abort());
await context.route('**/*fonts.gstatic.com/**', (route) => route.abort());

const htmlFiles = readdirSync(slidesDir).filter(f => f.endsWith('.html')).sort();

// Categorize pages by type based on filename
const featurePages = htmlFiles.filter(f => /page-[1-4]-top/.test(f));
const halfPages = htmlFiles.filter(f => /page-[56]-second/.test(f));
const briefsPage = htmlFiles.filter(f => /page-7-briefs/.test(f));
const coverPage = htmlFiles.filter(f => /page-0-cover/.test(f));

/**
 * Helper: open an HTML file in Playwright and run a measurement function.
 */
async function measurePage(htmlFile, measureFn) {
  const page = await context.newPage();
  const filePath = resolve(join(slidesDir, htmlFile));
  await page.goto(`file://${filePath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);
  const result = await page.evaluate(measureFn);
  await page.close();
  return result;
}

// ============================================================
// EVAL 1: Feature Page Content Fill
// On feature pages (1-4), the gap between the last content
// element in .content and the .footer should be < 200px.
// Supports both v1 selectors (.content-body/.source-section) and v2 (.content/.footer).
// ============================================================
try {
  const failures = [];
  for (const file of featurePages) {
    const measurement = await measurePage(file, () => {
      // Try v2 selectors first, fall back to v1
      const contentBody = document.querySelector('.content') || document.querySelector('.content-body');
      const sourceSection = document.querySelector('.footer') || document.querySelector('.source-section');
      if (!contentBody || !sourceSection) return { gap: 9999, error: 'missing elements' };

      // Get the bottom of the last child in content area
      const children = contentBody.children;
      let lastChildBottom = 0;
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        if (rect.bottom > lastChildBottom) lastChildBottom = rect.bottom;
      }

      // Get the top of footer/source section
      const sourceTop = sourceSection.getBoundingClientRect().top;
      const gap = sourceTop - lastChildBottom;

      return { gap: Math.round(gap), contentBodyHeight: Math.round(contentBody.getBoundingClientRect().height) };
    });

    if (measurement.gap >= 200) {
      failures.push(`${file}: gap=${measurement.gap}px (max 200)`);
    }
  }

  addEvalResult(
    'Feature Page Content Fill',
    'On feature pages (1-4), is the gap between content and source footer < 200px?',
    failures.length === 0,
    failures.length === 0
      ? `All ${featurePages.length} feature pages have adequate content fill`
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Feature Page Content Fill', '', false, null, err.message);
}

// ============================================================
// EVAL 2: Half-Page Story Fill
// On half-pages (5-6), each .story's text content should fill
// >= 60% of its container height.
// ============================================================
try {
  const failures = [];
  for (const file of halfPages) {
    const measurement = await measurePage(file, () => {
      const stories = document.querySelectorAll('.story');
      const results = [];
      for (const story of stories) {
        const storyRect = story.getBoundingClientRect();
        const storyHeight = storyRect.height;

        // Sum the heights of all text children
        let textHeight = 0;
        for (const child of story.children) {
          const childRect = child.getBoundingClientRect();
          textHeight += childRect.height;
        }

        const fillRatio = storyHeight > 0 ? textHeight / storyHeight : 0;
        results.push({
          storyHeight: Math.round(storyHeight),
          textHeight: Math.round(textHeight),
          fillRatio: Math.round(fillRatio * 100),
        });
      }
      return results;
    });

    for (let i = 0; i < measurement.length; i++) {
      const m = measurement[i];
      if (m.fillRatio < 60) {
        failures.push(`${file} story${i + 1}: fill=${m.fillRatio}% (min 60%), text=${m.textHeight}px / container=${m.storyHeight}px`);
      }
    }
  }

  addEvalResult(
    'Half-Page Story Fill',
    'On half-pages (5-6), does each story\'s text fill >= 60% of its container?',
    failures.length === 0,
    failures.length === 0
      ? `All stories on ${halfPages.length} half-pages fill >= 60%`
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Half-Page Story Fill', '', false, null, err.message);
}

// ============================================================
// EVAL 3: No Excessive Bottom Whitespace
// Every page should have < 25% blank space at the bottom
// (last visible element's bottom within 480px of page bottom).
// ============================================================
try {
  const failures = [];
  const allPages = [...coverPage, ...featurePages, ...halfPages, ...briefsPage];

  for (const file of allPages) {
    const measurement = await measurePage(file, () => {
      const PAGE_HEIGHT = 1920;
      // Find the bottommost visible element
      const allElements = document.querySelectorAll('*');
      let maxBottom = 0;
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        // Skip elements with zero dimensions
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      }
      const bottomGap = PAGE_HEIGHT - maxBottom;
      return { maxBottom: Math.round(maxBottom), bottomGap: Math.round(bottomGap) };
    });

    // 25% of 1920 = 480px
    if (measurement.bottomGap > 480) {
      failures.push(`${file}: bottomGap=${measurement.bottomGap}px (max 480)`);
    }
  }

  addEvalResult(
    'No Excessive Bottom Whitespace',
    'Does every page have < 25% blank space at the bottom?',
    failures.length === 0,
    failures.length === 0
      ? `All ${allPages.length} pages have acceptable bottom whitespace`
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('No Excessive Bottom Whitespace', '', false, null, err.message);
}

// ============================================================
// EVAL 4: Minimum Font Size Compliance
// All visible text elements meet minimum font sizes per density-spec.md:
// Feature: headline >= 56px, body/summary >= 36px
// Half-page: headline >= 36px, summary >= 32px
// Briefs: title >= 28px, summary >= 24px
// ============================================================
try {
  const failures = [];

  // Check feature pages
  for (const file of featurePages) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const headline = document.querySelector('.headline-zh');
      if (headline) {
        const size = parseFloat(getComputedStyle(headline).fontSize);
        if (size < 56) problems.push(`headline-zh: ${size}px (min 56)`);
      }
      // v2 uses .content p for body text; v1 used .summary
      const summary = document.querySelector('.summary') || document.querySelector('.content p');
      if (summary) {
        const size = parseFloat(getComputedStyle(summary).fontSize);
        if (size < 36) problems.push(`body text: ${size}px (min 36)`);
      }
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

  // Check half-pages
  for (const file of halfPages) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const headlines = document.querySelectorAll('.story .headline-zh');
      headlines.forEach((h, i) => {
        const size = parseFloat(getComputedStyle(h).fontSize);
        if (size < 36) problems.push(`story${i + 1} headline: ${size}px (min 36)`);
      });
      const summaries = document.querySelectorAll('.story .summary');
      summaries.forEach((s, i) => {
        const size = parseFloat(getComputedStyle(s).fontSize);
        if (size < 32) problems.push(`story${i + 1} summary: ${size}px (min 32)`);
      });
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

  // Check briefs page
  for (const file of briefsPage) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const titles = document.querySelectorAll('.brief-card .title');
      titles.forEach((t, i) => {
        const size = parseFloat(getComputedStyle(t).fontSize);
        if (size < 28) problems.push(`card${i + 1} title: ${size}px (min 28)`);
      });
      const summaries = document.querySelectorAll('.brief-card .summary');
      summaries.forEach((s, i) => {
        const size = parseFloat(getComputedStyle(s).fontSize);
        if (size < 24) problems.push(`card${i + 1} summary: ${size}px (min 24)`);
      });
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

  addEvalResult(
    'Minimum Font Size Compliance',
    'Are all visible text elements at or above minimum font sizes per density-spec.md?',
    failures.length === 0,
    failures.length === 0
      ? 'All text elements meet minimum font sizes'
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Minimum Font Size Compliance', '', false, null, err.message);
}

// ============================================================
// EVAL 5: Inter-Element Gap Compliance
// Gaps between sibling content elements should be <= 40px.
// density-spec.md says card gap <= 24px for briefs grid,
// but we use 40px as a general threshold for all pages.
// ============================================================
try {
  const failures = [];

  // Check briefs page: gap between .brief-card elements in grid
  for (const file of briefsPage) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const cards = document.querySelectorAll('.brief-card');
      const rects = Array.from(cards).map(c => c.getBoundingClientRect());

      // Check vertical gaps between cards in the same column
      // Grid is 2 columns x 4 rows, so cards 0,2,4,6 are left col; 1,3,5,7 are right col
      for (const col of [[0, 2, 4, 6], [1, 3, 5, 7]]) {
        for (let i = 0; i < col.length - 1; i++) {
          const curr = rects[col[i]];
          const next = rects[col[i + 1]];
          if (curr && next) {
            const gap = next.top - curr.bottom;
            if (gap > 24) {
              problems.push(`cards ${col[i]}-${col[i + 1]}: gap=${Math.round(gap)}px (max 24)`);
            }
          }
        }
      }
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

  // Check half-pages: gap between .story elements
  for (const file of halfPages) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const stories = document.querySelectorAll('.story');
      const rects = Array.from(stories).map(s => s.getBoundingClientRect());
      for (let i = 0; i < rects.length - 1; i++) {
        // Stories may overlap (border-top sits on divider), so check for excessive gaps
        const gap = rects[i + 1].top - rects[i].bottom;
        if (gap > 40) {
          problems.push(`stories ${i}-${i + 1}: gap=${Math.round(gap)}px (max 40)`);
        }
      }
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

  addEvalResult(
    'Inter-Element Gap Compliance',
    'Are all gaps between sibling content elements within limits (briefs <= 24px, others <= 40px)?',
    failures.length === 0,
    failures.length === 0
      ? 'All inter-element gaps within limits'
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Inter-Element Gap Compliance', '', false, null, err.message);
}

await browser.close();

results.pass_rate = Math.round((results.total_pass / results.total_evals) * 100 * 10) / 10;

console.log(JSON.stringify(results, null, 2));
