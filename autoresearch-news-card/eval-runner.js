#!/usr/bin/env node

/**
 * Autoresearch eval runner for news-card skill.
 * Renders sample digest → screenshots → scores 6 binary evals.
 *
 * Usage: node eval-runner.js [--run-id N]
 * Output: JSON with pass/fail for each eval
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const SKILL_DIR = join(PROJECT_ROOT, 'skills', 'news-card');
const SAMPLE_DIGEST = join(SKILL_DIR, 'examples', 'sample-digest.json');
const TEMPLATES_DIR = join(SKILL_DIR, 'templates');
const RENDER_SCRIPT = join(SKILL_DIR, 'scripts', 'lib', 'render-html.js');
const SCREENSHOT_SCRIPT = join(SKILL_DIR, 'scripts', 'lib', 'screenshot-playwright.js');

const args = process.argv.slice(2);
const runIdIdx = args.indexOf('--run-id');
const runId = runIdIdx !== -1 ? args[runIdIdx + 1] : Date.now().toString();

const slidesDir = join(PROJECT_ROOT, 'autoresearch-news-card', `run-${runId}`, 'slides');
const imagesDir = join(PROJECT_ROOT, 'autoresearch-news-card', `run-${runId}`, 'images');

const results = {
  run_id: runId,
  evals: [],
  total_pass: 0,
  total_evals: 6,
  pass_rate: 0,
};

function runEval(name, question, fn) {
  try {
    const { passed, detail } = fn();
    results.evals.push({ name, question, passed, detail: detail || null, error: null });
    if (passed) results.total_pass++;
  } catch (err) {
    results.evals.push({ name, question, passed: false, detail: null, error: err.message });
  }
}

// === Pipeline: Render HTML ===
console.error(`[eval] Rendering HTML to ${slidesDir}...`);
let renderOk = false;
try {
  execSync(
    `node ${RENDER_SCRIPT} --input ${SAMPLE_DIGEST} --templates ${TEMPLATES_DIR} --output ${slidesDir}`,
    { stdio: ['pipe', 'pipe', 'pipe'], cwd: PROJECT_ROOT }
  );
  renderOk = true;
} catch (err) {
  console.error(`[eval] Render failed: ${err.stderr?.toString() || err.message}`);
}

// === Pipeline: Screenshot ===
let screenshotOk = false;
if (renderOk) {
  console.error(`[eval] Taking screenshots to ${imagesDir}...`);
  try {
    execSync(
      `node ${SCREENSHOT_SCRIPT} --input ${slidesDir} --output ${imagesDir}`,
      { stdio: ['pipe', 'pipe', 'pipe'], cwd: PROJECT_ROOT, timeout: 120000 }
    );
    screenshotOk = true;
  } catch (err) {
    console.error(`[eval] Screenshot failed: ${err.stderr?.toString() || err.message}`);
  }
}

// ============================================================
// EVAL 1: Output File Count — exactly 8 PNGs in images/
// ============================================================
runEval(
  'Output File Count',
  'Does the run produce exactly 8 PNG files in the images directory?',
  () => {
    if (!existsSync(imagesDir)) return { passed: false, detail: 'images/ directory does not exist' };
    const pngs = readdirSync(imagesDir).filter(f => f.endsWith('.png'));
    return {
      passed: pngs.length === 8,
      detail: `Found ${pngs.length} PNG files: ${pngs.join(', ')}`,
    };
  }
);

// ============================================================
// EVAL 2: PNG Dimensions — every PNG is exactly 2160×3840
// ============================================================
runEval(
  'PNG Dimensions',
  'Are all generated PNG files exactly 2160×3840 pixels?',
  () => {
    if (!existsSync(imagesDir)) return { passed: false, detail: 'images/ directory missing' };
    const pngs = readdirSync(imagesDir).filter(f => f.endsWith('.png'));
    if (pngs.length === 0) return { passed: false, detail: 'No PNG files found' };
    const bad = [];
    for (const file of pngs) {
      const buf = readFileSync(join(imagesDir, file));
      if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) {
        bad.push(`${file}: not a valid PNG`);
        continue;
      }
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w !== 2160 || h !== 3840) bad.push(`${file}: ${w}×${h}`);
    }
    return {
      passed: bad.length === 0,
      detail: bad.length === 0 ? 'All 2160×3840' : `Bad: ${bad.join('; ')}`,
    };
  }
);

// ============================================================
// EVAL 3: Tier Distribution — 4 tier-1, 4 tier-2, 8 tier-3
// ============================================================
runEval(
  'Tier Distribution',
  'Does digest.json contain exactly 16 items with 4 tier-1, 4 tier-2, and 8 tier-3 entries?',
  () => {
    const digest = JSON.parse(readFileSync(SAMPLE_DIGEST, 'utf-8'));
    const items = Array.isArray(digest) ? digest : digest.items || [];
    const t1 = items.filter(i => i.tier === 1).length;
    const t2 = items.filter(i => i.tier === 2).length;
    const t3 = items.filter(i => i.tier === 3).length;
    const total = items.length;
    const ok = t1 === 4 && t2 === 4 && t3 === 8 && total === 16;
    return {
      passed: ok,
      detail: `Total=${total}, T1=${t1}, T2=${t2}, T3=${t3}`,
    };
  }
);

// ============================================================
// EVAL 4: Tier-1 Category Diversity — 4 different categories
// ============================================================
runEval(
  'Tier-1 Category Diversity',
  'Do the 4 tier-1 stories belong to 4 different categories?',
  () => {
    const digest = JSON.parse(readFileSync(SAMPLE_DIGEST, 'utf-8'));
    const items = Array.isArray(digest) ? digest : digest.items || [];
    const tier1 = items.filter(i => i.tier === 1);
    const categories = tier1.map(i => i.category);
    const unique = new Set(categories);
    return {
      passed: tier1.length === 4 && unique.size === 4,
      detail: `Tier-1 categories: ${categories.join(', ')} (${unique.size} unique)`,
    };
  }
);

// ============================================================
// EVAL 5: Render Integrity — no template artifacts, no empty fields
// ============================================================
runEval(
  'Render Integrity',
  'Are all rendered HTML files free of unresolved template placeholders and missing required fields?',
  () => {
    if (!existsSync(slidesDir)) return { passed: false, detail: 'slides/ directory missing' };
    const htmlFiles = readdirSync(slidesDir).filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 0) return { passed: false, detail: 'No HTML files' };
    const problems = [];
    for (const file of htmlFiles) {
      const content = readFileSync(join(slidesDir, file), 'utf-8');
      // Strip HTML comments (they may contain template descriptions)
      const clean = content.replace(/<!--[\s\S]*?-->/g, '');
      // Check for raw template syntax
      if (/\{\{[#/]?(each|if)\b/.test(clean)) problems.push(`${file}: raw block tag`);
      if (/\{\{\w+\}\}/.test(clean)) problems.push(`${file}: unresolved {{var}}`);
      if (/\{\{\.\.\//.test(clean)) problems.push(`${file}: unresolved {{../var}}`);
      // Check for literal "undefined" or "null" in visible text (outside tags)
      const textOnly = clean.replace(/<[^>]*>/g, ' ');
      if (/\bundefined\b/.test(textOnly)) problems.push(`${file}: "undefined" in text`);
      if (/\bnull\b/.test(textOnly)) problems.push(`${file}: "null" in text`);
      // Check for empty required visible areas (headline containers with no text)
      // Look for elements that should have content but are empty
      const emptyDiv = /<div class="(headline[_-]zh|summary|title)">\s*<\/div>/;
      if (emptyDiv.test(clean)) problems.push(`${file}: empty required field`);
    }
    return {
      passed: problems.length === 0,
      detail: problems.length === 0 ? 'All clean' : problems.join('; '),
    };
  }
);

// ============================================================
// EVAL 6: Text Fit and Legibility (structural check)
// Checks that no text is likely to overflow its container.
// A full visual check requires human/multimodal review — this
// checks structural properties that cause common overflow issues.
// ============================================================
runEval(
  'Text Fit and Legibility',
  'Is all text in every PNG fully visible with no truncation, overlap, or cutoff at card boundaries?',
  () => {
    if (!existsSync(slidesDir)) return { passed: false, detail: 'slides/ missing' };
    const htmlFiles = readdirSync(slidesDir).filter(f => f.endsWith('.html'));
    const problems = [];
    for (const file of htmlFiles) {
      const content = readFileSync(join(slidesDir, file), 'utf-8');
      // Check: viewport is set to 1080×1920 with overflow hidden
      if (!/width:\s*1080px/.test(content)) problems.push(`${file}: missing 1080px width`);
      if (!/height:\s*1920px/.test(content)) problems.push(`${file}: missing 1920px height`);
      if (!/overflow:\s*hidden/.test(content)) problems.push(`${file}: missing overflow:hidden`);
      // Check: box-sizing border-box is used (prevents padding overflow)
      if (!/box-sizing:\s*border-box/.test(content)) problems.push(`${file}: missing box-sizing`);
    }
    // Also check that screenshots were produced (visual output exists)
    if (!screenshotOk) problems.push('Screenshots failed — cannot verify visual output');
    return {
      passed: problems.length === 0,
      detail: problems.length === 0 ? 'All structural checks pass' : problems.join('; '),
    };
  }
);

results.pass_rate = Math.round((results.total_pass / results.total_evals) * 100 * 10) / 10;

console.log(JSON.stringify(results, null, 2));
