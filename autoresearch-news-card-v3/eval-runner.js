#!/usr/bin/env node

/**
 * Autoresearch v3 eval runner for news-card skill.
 * Renders sample digest -> opens in Playwright -> measures DOM layout -> scores 6 evals.
 *
 * Evals:
 *   1. Half-Page Text Density (>= 960px total text height on pages 5-6)
 *   2. Cover Page Bottom Utilization (bottommost content >= 1440px on page 0)
 *   3. Feature Page Component Count (>= 2 distinct component types per feature page)
 *   4. Minimum Font Size (same thresholds as v2)
 *   5. No Excessive Whitespace (tightened to 15% = 288px max bottom gap)
 *   6. Briefs Grid Content (all 8 cards have title >= 5 chars, summary >= 10 chars)
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

const slidesDir = join(PROJECT_ROOT, 'autoresearch-news-card-v3', `run-${runId}`, 'slides');

const TOTAL_EVALS = 6;
const results = {
  run_id: runId,
  evals: [],
  total_pass: 0,
  total_evals: TOTAL_EVALS,
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
  for (let i = 0; i < TOTAL_EVALS; i++) {
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
// EVAL 1: Half-Page Text Density
// On pages 5-6, total height of text elements >= 960px (50% of 1920px)
// ============================================================
try {
  const failures = [];
  for (const file of halfPages) {
    const measurement = await measurePage(file, () => {
      const selectors = ['.headline-zh', '.headline-en', '.summary', '.source-bar', '.category-tag', '.footer'];
      let totalHeight = 0;
      const details = [];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.height > 0) {
            totalHeight += rect.height;
            details.push(`${sel}: ${Math.round(rect.height)}px`);
          }
        }
      }
      return { totalHeight: Math.round(totalHeight), details };
    });

    if (measurement.totalHeight < 960) {
      failures.push(`${file}: totalTextHeight=${measurement.totalHeight}px (min 960) [${measurement.details.join(', ')}]`);
    }
  }

  addEvalResult(
    'Half-Page Text Density',
    'On pages 5-6, is total text element height >= 960px (50% of 1920)?',
    failures.length === 0,
    failures.length === 0
      ? `All ${halfPages.length} half-pages meet 960px text density threshold`
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Half-Page Text Density', '', false, null, err.message);
}

// ============================================================
// EVAL 2: Cover Page Bottom Utilization
// On page 0, bottommost content element (excluding .footer) >= 1440px
// ============================================================
try {
  const failures = [];
  for (const file of coverPage) {
    const measurement = await measurePage(file, () => {
      const allElements = document.querySelectorAll('*:not(.footer):not(.footer *)');
      let maxBottom = 0;
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      }
      return { maxBottom: Math.round(maxBottom) };
    });

    if (measurement.maxBottom < 1440) {
      failures.push(`${file}: bottommost content at ${measurement.maxBottom}px (min 1440)`);
    }
  }

  addEvalResult(
    'Cover Page Bottom Utilization',
    'On page 0, does the bottommost content (excl. footer) reach >= 1440px (75%)?',
    failures.length === 0,
    failures.length === 0
      ? 'Cover page content extends to >= 75% of page height'
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Cover Page Bottom Utilization', '', false, null, err.message);
}

// ============================================================
// EVAL 3: Feature Page Component Count
// On pages 1-4, count distinct component classes in .content
// Pass: every feature page has >= 2 distinct component types
// ============================================================
try {
  const COMPONENT_SELECTORS = [
    '.data-row', '.data-highlight', '.timeline', '.timeline-item',
    '.compare-grid', '.compare-table', '.pros-cons',
    '.progress-group', '.pie-chart-container', '.bubble-chart',
    '.concept-map', '.formula-box', '.definition-list',
    '.venn', '.quadrant', '.cycle', '.fishbone',
    '.tag-cloud', '.numbered-grid', '.checklist',
    '.badge-list', '.chat-bubble', '.person-card',
    '.flowchart', '.funnel', '.gantt', '.decision-tree',
    'blockquote', '.callout', '.highlight', '.key-points',
  ];

  const failures = [];
  for (const file of featurePages) {
    const page = await context.newPage();
    const filePath = resolve(join(slidesDir, file));
    await page.goto(`file://${filePath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(500);
    const result = await page.evaluate((selectors) => {
      const content = document.querySelector('.content');
      if (!content) return { count: 0, found: [] };
      const found = [];
      for (const sel of selectors) {
        if (content.querySelector(sel)) {
          found.push(sel);
        }
      }
      return { count: found.length, found };
    }, COMPONENT_SELECTORS);
    await page.close();

    if (result.count < 2) {
      failures.push(`${file}: ${result.count} component types (min 2) [found: ${result.found.join(', ') || 'none'}]`);
    }
  }

  addEvalResult(
    'Feature Page Component Count',
    'On pages 1-4, does each feature page use >= 2 distinct component types?',
    failures.length === 0,
    failures.length === 0
      ? `All ${featurePages.length} feature pages use >= 2 component types`
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Feature Page Component Count', '', false, null, err.message);
}

// ============================================================
// EVAL 4: Minimum Font Size Compliance
// Feature: headline >= 56px, body >= 36px
// Half-page: headline >= 36px, summary >= 32px
// Briefs: title >= 28px, summary >= 24px
// ============================================================
try {
  const failures = [];

  for (const file of featurePages) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const headline = document.querySelector('.headline-zh');
      if (headline) {
        const size = parseFloat(getComputedStyle(headline).fontSize);
        if (size < 56) problems.push(`headline-zh: ${size}px (min 56)`);
      }
      const summary = document.querySelector('.summary') || document.querySelector('.content p');
      if (summary) {
        const size = parseFloat(getComputedStyle(summary).fontSize);
        if (size < 36) problems.push(`body text: ${size}px (min 36)`);
      }
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

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
    'Are all visible text elements at or above minimum font sizes?',
    failures.length === 0,
    failures.length === 0
      ? 'All text elements meet minimum font sizes'
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Minimum Font Size Compliance', '', false, null, err.message);
}

// ============================================================
// EVAL 5: No Excessive Whitespace (tightened to 15%)
// Every page's last visible element must be within 288px of page bottom
// ============================================================
try {
  const failures = [];
  const allPages = [...coverPage, ...featurePages, ...halfPages, ...briefsPage];

  for (const file of allPages) {
    const measurement = await measurePage(file, () => {
      const PAGE_HEIGHT = 1920;
      const allElements = document.querySelectorAll('*');
      let maxBottom = 0;
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      }
      const bottomGap = PAGE_HEIGHT - maxBottom;
      return { maxBottom: Math.round(maxBottom), bottomGap: Math.round(bottomGap) };
    });

    if (measurement.bottomGap > 288) {
      failures.push(`${file}: bottomGap=${measurement.bottomGap}px (max 288)`);
    }
  }

  addEvalResult(
    'No Excessive Whitespace',
    'Does every page have < 15% blank space at bottom (gap <= 288px)?',
    failures.length === 0,
    failures.length === 0
      ? `All ${allPages.length} pages have bottom gap <= 288px`
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('No Excessive Whitespace', '', false, null, err.message);
}

// ============================================================
// EVAL 6: Briefs Grid Content
// On page 7, each .brief-card must have .title with text >= 5 chars
// AND .summary with text >= 10 chars
// ============================================================
try {
  const failures = [];
  for (const file of briefsPage) {
    const issues = await measurePage(file, () => {
      const problems = [];
      const cards = document.querySelectorAll('.brief-card');
      cards.forEach((card, i) => {
        const title = card.querySelector('.title');
        const summary = card.querySelector('.summary');
        const titleLen = title ? title.textContent.trim().length : 0;
        const summaryLen = summary ? summary.textContent.trim().length : 0;
        if (titleLen < 5) {
          problems.push(`card${i + 1} title: ${titleLen} chars (min 5)`);
        }
        if (summaryLen < 10) {
          problems.push(`card${i + 1} summary: ${summaryLen} chars (min 10)`);
        }
      });
      return problems;
    });
    if (issues.length > 0) failures.push(`${file}: ${issues.join(', ')}`);
  }

  addEvalResult(
    'Briefs Grid Content',
    'On page 7, do all 8 brief-cards have title >= 5 chars and summary >= 10 chars?',
    failures.length === 0,
    failures.length === 0
      ? 'All brief cards have sufficient title and summary content'
      : failures.join('; ')
  );
} catch (err) {
  addEvalResult('Briefs Grid Content', '', false, null, err.message);
}

await browser.close();

results.pass_rate = Math.round((results.total_pass / results.total_evals) * 100 * 10) / 10;

console.log(JSON.stringify(results, null, 2));
