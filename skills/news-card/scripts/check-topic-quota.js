#!/usr/bin/env node
/**
 * check-topic-quota.js — Step 3.7 topic quota validator.
 *
 * Verifies digest.json (or digest-xhs.json) complies with the topic quota
 * rules defined in references/workflows/curation-framework.md.
 *
 * Usage: node check-topic-quota.js <digest.json>
 * Exit: 0 = pass, 1 = violations found.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { classifyTopic } from './lib/score-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Quota rules ─────────────────────────────────────────────────────────
// Categories that are hard-capped per tier (politics/unrest/religion/health/finance/ai_reg)
const PENALTY_TOPICS = new Set([
  'politics', 'unrest', 'religion_ethics', 'health_ai', 'finance_ai', 'ai_reg',
]);
const HARD_BLOCK_TOPICS = new Set(['sovereignty']);

const QUOTA = {
  T1: { // politics/unrest/health/finance/religion/ai_reg — 每类 ≤ 0
    politics: 0, unrest: 0, religion_ethics: 0, health_ai: 0, finance_ai: 0, ai_reg: 0,
  },
  T2: { // 每类 ≤ 1
    politics: 0, unrest: 0, religion_ethics: 1, health_ai: 1, finance_ai: 1, ai_reg: 1,
  },
  T3: { // 合计 ≤ 2 per cluster
    politics_plus_unrest: 2,
    health_plus_finance: 2,
    religion_ethics: 2,
    ai_reg: 2,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────
function classifyItem(item) {
  // Use headline_zh + summary_zh for re-classification at this stage
  // (digest uses Chinese content, not the raw English source).
  const synthetic = {
    title: item.headline_zh || '',
    summary: item.summary_zh || '',
    source: item.source || '',
  };
  return classifyTopic(synthetic);
}

// ── Main validator ──────────────────────────────────────────────────────
function validate(data) {
  const errors = [];
  const warnings = [];
  const report = { T1: [], T2: [], T3: [] };

  // Group by tier
  const tiers = { 1: [], 2: [], 3: [] };
  for (const item of data) {
    const topic = classifyItem(item);
    const record = { headline: item.headline_zh, topic: topic.topic, adjustment: topic.adjustment };
    (tiers[item.tier] || []).push(record);
    report[`T${item.tier}`].push(record);
  }

  // Hard block: sovereignty anywhere
  for (const [tierNum, items] of Object.entries(tiers)) {
    for (const it of items) {
      if (HARD_BLOCK_TOPICS.has(it.topic)) {
        errors.push(`SOVEREIGNTY (hard block) in T${tierNum}: "${it.headline}"`);
      }
    }
  }

  // T1 quotas
  const t1Counts = {};
  for (const it of tiers[1]) {
    if (PENALTY_TOPICS.has(it.topic)) {
      t1Counts[it.topic] = (t1Counts[it.topic] || 0) + 1;
    }
  }
  for (const [topic, max] of Object.entries(QUOTA.T1)) {
    if ((t1Counts[topic] || 0) > max) {
      errors.push(`T1 QUOTA: topic "${topic}" has ${t1Counts[topic]} item(s), max ${max}`);
    }
  }

  // T2 quotas
  const t2Counts = {};
  for (const it of tiers[2]) {
    if (PENALTY_TOPICS.has(it.topic)) {
      t2Counts[it.topic] = (t2Counts[it.topic] || 0) + 1;
    }
  }
  for (const [topic, max] of Object.entries(QUOTA.T2)) {
    if ((t2Counts[topic] || 0) > max) {
      errors.push(`T2 QUOTA: topic "${topic}" has ${t2Counts[topic]} item(s), max ${max}`);
    }
  }

  // T3 cluster quotas
  const t3Counts = { politics_plus_unrest: 0, health_plus_finance: 0, religion_ethics: 0, ai_reg: 0 };
  for (const it of tiers[3]) {
    if (it.topic === 'politics' || it.topic === 'unrest') t3Counts.politics_plus_unrest++;
    if (it.topic === 'health_ai' || it.topic === 'finance_ai') t3Counts.health_plus_finance++;
    if (it.topic === 'religion_ethics') t3Counts.religion_ethics++;
    if (it.topic === 'ai_reg') t3Counts.ai_reg++;
  }
  for (const [cluster, max] of Object.entries(QUOTA.T3)) {
    if (t3Counts[cluster] > max) {
      errors.push(`T3 QUOTA: cluster "${cluster}" has ${t3Counts[cluster]} item(s), max ${max}`);
    }
  }

  return { errors, warnings, report };
}

// ── CLI ──────────────────────────────────────────────────────────────────
const digestPath = process.argv[2];
if (!digestPath) {
  console.error('Usage: node check-topic-quota.js <digest.json>');
  process.exit(2);
}

const data = JSON.parse(readFileSync(resolve(digestPath), 'utf-8'));
const { errors, warnings, report } = validate(data);

console.log(`📋 Topic quota check: ${digestPath} (${data.length} items)\n`);

// Print per-tier topic breakdown
for (const tier of ['T1', 'T2', 'T3']) {
  console.log(`  ${tier}:`);
  for (const rec of report[tier]) {
    const marker = PENALTY_TOPICS.has(rec.topic) ? '⚠️ ' : HARD_BLOCK_TOPICS.has(rec.topic) ? '❌ ' : '   ';
    console.log(`    ${marker}[${rec.topic.padEnd(18)}] ${rec.headline}`);
  }
  console.log();
}

if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warning(s):`);
  warnings.forEach(w => console.log(`  ⚠️  ${w}`));
}

if (errors.length) {
  console.log(`\n❌ ${errors.length} violation(s):`);
  errors.forEach(e => console.log(`  ❌ ${e}`));
  process.exit(1);
}

console.log('✅ ALL CHECKS PASSED');
process.exit(0);
