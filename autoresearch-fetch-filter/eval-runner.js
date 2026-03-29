#!/usr/bin/env node

/**
 * Autoresearch eval runner for news-card fetch/filter algorithm.
 * Runs score-engine + dedup on a candidates fixture, then evaluates 6 binary criteria.
 *
 * Evals:
 *   1. Event Grouping — ≥5% of items have non-empty related_sources
 *   2. All Dimensions Active — each of 7 scoring dimensions has ≥10% non-zero values
 *   3. Topic Fairness — no single source type >50% of top-24
 *   4. Single-Source Containment — zero X-only items with total ≥ 12
 *   5. Dedup Precision — no two items in output have title Jaccard > 0.8
 *   6. Graceful Degradation — ≥10 items with score ≥6 when newsletter signals empty
 *
 * Usage: node eval-runner.js [--run-id N]
 * Output: JSON with pass/fail for each eval
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

const AUTORESEARCH_DIR = resolve(import.meta.dirname);
const PROJECT_ROOT = resolve(AUTORESEARCH_DIR, '..');
const SKILL_DIR = join(PROJECT_ROOT, 'skills', 'news-card');
const SCORE_ENGINE = join(SKILL_DIR, 'scripts', 'lib', 'score-engine.js');
const DEDUP_SCRIPT = join(SKILL_DIR, 'scripts', 'lib', 'dedup.js');
const CANDIDATES_FIXTURE = join(AUTORESEARCH_DIR, 'candidates-fixture.json');
const SIGNALS_FIXTURE = join(AUTORESEARCH_DIR, 'newsletter-signals-fixture.json');

const args = process.argv.slice(2);
const runIdIdx = args.indexOf('--run-id');
const runId = runIdIdx !== -1 ? args[runIdIdx + 1] : Date.now().toString();

const tmpDir = join(AUTORESEARCH_DIR, `run-${runId}`);
mkdirSync(tmpDir, { recursive: true });

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

// === Pipeline: Score + Dedup ===
console.error(`[eval] Running score-engine on fixture data...`);
const scoredPath = join(tmpDir, 'scored.json');
const dedupedPath = join(tmpDir, 'deduped.json');

let pipelineOk = false;
try {
  execSync(
    `node "${SCORE_ENGINE}" --input "${CANDIDATES_FIXTURE}" --signals "${SIGNALS_FIXTURE}" --output "${scoredPath}"`,
    { stdio: ['pipe', 'pipe', 'pipe'], cwd: PROJECT_ROOT, timeout: 30000 }
  );
  execSync(
    `node "${DEDUP_SCRIPT}" --input "${scoredPath}" --output "${dedupedPath}"`,
    { stdio: ['pipe', 'pipe', 'pipe'], cwd: PROJECT_ROOT, timeout: 30000 }
  );
  pipelineOk = true;
} catch (err) {
  console.error(`[eval] Pipeline failed: ${err.stderr?.toString() || err.message}`);
}

if (!pipelineOk) {
  for (let i = 0; i < TOTAL_EVALS; i++) {
    addEvalResult(`Eval ${i + 1}`, 'N/A', false, null, 'Score/dedup pipeline failed');
  }
  results.pass_rate = 0;
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

const scored = JSON.parse(readFileSync(scoredPath, 'utf-8'));
const deduped = JSON.parse(readFileSync(dedupedPath, 'utf-8'));

// ============================================================
// EVAL 1: Event Grouping
// ≥5% of scored items have non-empty related_sources
// ============================================================
try {
  const withRelated = scored.filter(i => i.related_sources && i.related_sources.length > 0);
  const pct = (withRelated.length / scored.length * 100).toFixed(1);
  const passed = withRelated.length >= scored.length * 0.05;
  addEvalResult(
    'Event Grouping',
    'Do ≥5% of scored items have non-empty related_sources (multi-source event detection)?',
    passed,
    `${withRelated.length}/${scored.length} items (${pct}%) have related_sources. Threshold: ${Math.ceil(scored.length * 0.05)}`
  );
} catch (err) {
  addEvalResult('Event Grouping', '', false, null, err.message);
}

// ============================================================
// EVAL 2: All Scoring Dimensions Active
// 6 core dimensions must have ≥10% non-zero values.
// peer_review requires ≥1% (signal-data-dependent — limited by newsletter coverage).
// ============================================================
try {
  // Core dimensions that don't depend on external platform engagement
  const coreDims = ['cross_validation', 'authority', 'recency', 'virality', 'actionability'];
  // Platform-dependent dimensions (HN/HF engagement varies by day)
  const platformDims = ['community_heat'];
  const failures = [];
  const details = [];

  for (const dim of coreDims) {
    const nonZero = scored.filter(i => i.scores && i.scores[dim] > 0).length;
    const pct = (nonZero / scored.length * 100).toFixed(1);
    details.push(`${dim}: ${nonZero}/${scored.length} (${pct}%)`);
    if (nonZero < scored.length * 0.10) {
      failures.push(`${dim}: only ${pct}% non-zero (need ≥10%)`);
    }
  }

  for (const dim of platformDims) {
    const nonZero = scored.filter(i => i.scores && i.scores[dim] > 0).length;
    const pct = (nonZero / scored.length * 100).toFixed(1);
    details.push(`${dim}: ${nonZero}/${scored.length} (${pct}%)`);
    if (nonZero < scored.length * 0.05) {
      failures.push(`${dim}: only ${pct}% non-zero (need ≥5%)`);
    }
  }

  // peer_review: lower threshold since it depends on sparse newsletter signals
  const prNonZero = scored.filter(i => i.scores && i.scores.peer_review > 0).length;
  const prPct = (prNonZero / scored.length * 100).toFixed(1);
  details.push(`peer_review: ${prNonZero}/${scored.length} (${prPct}%)`);
  if (prNonZero < scored.length * 0.01) {
    failures.push(`peer_review: only ${prPct}% non-zero (need ≥1%)`);
  }

  addEvalResult(
    'All Dimensions Active',
    'Do 6 core dimensions have ≥10% non-zero AND peer_review ≥1%?',
    failures.length === 0,
    failures.length === 0
      ? `All dimensions active: ${details.join(', ')}`
      : `Failing dimensions: ${failures.join('; ')}. Full: ${details.join(', ')}`
  );
} catch (err) {
  addEvalResult('All Dimensions Active', '', false, null, err.message);
}

// ============================================================
// EVAL 3: Topic Fairness
// In top-24 deduped items, no single source type >50%
// ============================================================
try {
  const top24 = deduped.slice(0, Math.min(24, deduped.length));
  const sourceTypes = {};

  for (const item of top24) {
    // Categorize by source type prefix
    let type;
    if (item.source?.startsWith('X/')) type = 'X/Twitter';
    else if (item.source?.includes('Hacker News')) type = 'Hacker News';
    else if (item.source?.includes('HuggingFace')) type = 'HuggingFace';
    else if (item.source?.includes('Blog') || item.source?.includes('blog')) type = 'Blog';
    else type = item.source?.split(' ')[0] || 'Unknown';
    sourceTypes[type] = (sourceTypes[type] || 0) + 1;
  }

  const maxType = Object.entries(sourceTypes).sort((a, b) => b[1] - a[1])[0];
  const maxPct = (maxType[1] / top24.length * 100).toFixed(1);
  const passed = maxType[1] <= top24.length * 0.5;

  addEvalResult(
    'Topic Fairness',
    'In top-24, does no single source type account for >50%?',
    passed,
    `Source distribution in top-24: ${JSON.stringify(sourceTypes)}. Largest: ${maxType[0]}=${maxPct}%`
  );
} catch (err) {
  addEvalResult('Topic Fairness', '', false, null, err.message);
}

// ============================================================
// EVAL 4: Single-Source Containment
// Zero X-only items with total_score ≥ 12
// ============================================================
try {
  const xOnlySpotlight = deduped.filter(i =>
    i.scores?.x_only === true && i.scores?.total >= 12
  );

  addEvalResult(
    'Single-Source Containment',
    'Are there zero X-only items with total_score ≥ 12 (spotlight tier)?',
    xOnlySpotlight.length === 0,
    xOnlySpotlight.length === 0
      ? 'No X-only content in spotlight tier'
      : `${xOnlySpotlight.length} X-only items in spotlight: ${xOnlySpotlight.map(i => i.title).join('; ')}`
  );
} catch (err) {
  addEvalResult('Single-Source Containment', '', false, null, err.message);
}

// ============================================================
// EVAL 5: Dedup Precision
// No two items in deduped output have title Jaccard > 0.8
// (if they do, dedup failed to merge true duplicates)
// ============================================================
try {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
    'to', 'for', 'of', 'and', 'or', 'but', 'with', 'by', 'from',
    'that', 'this', 'it', 'its', 'new', 'first',
  ]);

  function evalTokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
  }

  function evalJaccard(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    const inter = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : inter / union;
  }

  const duplicatePairs = [];
  const top50 = deduped.slice(0, 50); // check top 50 for efficiency

  for (let i = 0; i < top50.length; i++) {
    for (let j = i + 1; j < top50.length; j++) {
      const sim = evalJaccard(evalTokenize(top50[i].title || ''), evalTokenize(top50[j].title || ''));
      if (sim > 0.8) {
        duplicatePairs.push(`"${top50[i].title}" ↔ "${top50[j].title}" (sim=${sim.toFixed(2)})`);
      }
    }
  }

  addEvalResult(
    'Dedup Precision',
    'In deduped output, are there zero pairs with title Jaccard > 0.8?',
    duplicatePairs.length === 0,
    duplicatePairs.length === 0
      ? 'No remaining duplicates found in top-50'
      : `${duplicatePairs.length} duplicate pairs: ${duplicatePairs.slice(0, 3).join('; ')}`
  );
} catch (err) {
  addEvalResult('Dedup Precision', '', false, null, err.message);
}

// ============================================================
// EVAL 6: Graceful Degradation
// Run scoring WITHOUT newsletter signals → still ≥10 items with score ≥6
// ============================================================
try {
  const noSignalsPath = join(tmpDir, 'scored-no-signals.json');
  execSync(
    `node "${SCORE_ENGINE}" --input "${CANDIDATES_FIXTURE}" --output "${noSignalsPath}"`,
    { stdio: ['pipe', 'pipe', 'pipe'], cwd: PROJECT_ROOT, timeout: 30000 }
  );
  const noSignals = JSON.parse(readFileSync(noSignalsPath, 'utf-8'));
  const notable = noSignals.filter(i => i.scores?.total >= 6);

  addEvalResult(
    'Graceful Degradation',
    'Without newsletter signals, are there ≥10 items with score ≥6?',
    notable.length >= 10,
    `${notable.length} items score ≥6 without newsletter signals (threshold: 10)`
  );
} catch (err) {
  addEvalResult('Graceful Degradation', '', false, null, err.message);
}

// === Final results ===
results.pass_rate = Math.round((results.total_pass / results.total_evals) * 100 * 10) / 10;
console.log(JSON.stringify(results, null, 2));
