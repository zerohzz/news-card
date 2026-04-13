#!/usr/bin/env node

/**
 * Generate a markdown audit report for scored candidates.
 * Usage:
 *   node generate-score-report.js --all scored.json --news scored-news.json --signals scored-signals.json --output scored-candidates.md
 */

import { readFileSync, writeFileSync } from 'fs';
import {
  countBySourceFamily,
  FOLLOW_BUILDERS_FAMILIES,
  normalizeCandidateSchema,
  splitCandidates,
} from './pipeline-utils.js';

function parseArgs(argv) {
  const args = argv.slice(2);
  const values = {};

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    const value = args[i + 1];
    if (key.startsWith('--') && value) {
      values[key.slice(2)] = value;
      i++;
    }
  }

  return values;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function formatScore(value) {
  if (value == null) return '0';
  return Number.isInteger(value) ? String(value) : String(value.toFixed(1));
}

function formatSourceFamilyCounts(items) {
  const counts = countBySourceFamily(items);
  if (counts.length === 0) return '- none';
  return counts
    .map(({ source_family, count }) => `- \`${source_family}\`: ${count}`)
    .join('\n');
}

function formatFollowBuildersBreakdown(items) {
  const filtered = items.filter((item) => FOLLOW_BUILDERS_FAMILIES.has(item.source_family));
  if (filtered.length === 0) return '- none';
  return formatSourceFamilyCounts(filtered);
}

function formatScoreBands(items) {
  const spotlight = items.filter((item) => (item.scores?.total || 0) >= 12).length;
  const notable = items.filter((item) => (item.scores?.total || 0) >= 6 && (item.scores?.total || 0) < 12).length;
  const discard = items.filter((item) => (item.scores?.total || 0) < 6).length;
  return `- \`>= 12\`: ${spotlight}\n- \`>= 6 and < 12\`: ${notable}\n- \`< 6\`: ${discard}`;
}

function formatCandidate(item, index, pool) {
  const scores = item.scores || {};
  const relatedSources = (item.related_sources || []).map((source) => source.source).filter(Boolean);
  const relatedLabel = relatedSources.length > 0 ? relatedSources.join(', ') : 'none';
  const selectedLabel = item.selected_for_digest === true ? 'yes' : item.selected_for_digest === false ? 'no' : 'pending';

  return [
    `## ${index + 1}. ${item.title || '(untitled)'}`,
    `- pool: \`${pool}\``,
    `- selection_status: ${selectedLabel}`,
    `- source: ${item.source || 'Unknown Source'}`,
    `- source_family: \`${item.source_family}\``,
    `- source_collection: \`${item.source_collection}\``,
    `- source_authority: ${formatScore(item.source_authority)}`,
    `- published: ${item.published || ''}`,
    `- total_score: ${formatScore(scores.total || 0)}`,
    `- score_breakdown: cross_validation=${formatScore(scores.cross_validation)}, community_heat=${formatScore(scores.community_heat)}, authority=${formatScore(scores.authority)}, recency=${formatScore(scores.recency)}, virality=${formatScore(scores.virality)}, actionability=${formatScore(scores.actionability)}, peer_review=${formatScore(scores.peer_review)}, topic_adjustment=${formatScore(scores.topic_adjustment || 0)}`,
    `- topic_hint: ${item.topic_hint || 'neutral'}`,
    `- x_only: ${scores.x_only ? 'true' : 'false'}`,
    `- requires_confirmation: ${scores.requires_confirmation || item.requires_confirmation ? 'true' : 'false'}`,
    `- related_sources: ${relatedLabel}`,
    item.url ? `- url: ${item.url}` : '- url: ',
    item.summary ? `- summary: ${item.summary.replace(/\s+/g, ' ').trim()}` : '- summary: ',
    '',
  ].join('\n');
}

function buildReport(all, news, signals) {
  const timestamp = new Date().toISOString();
  const normalizedAll = all.map((item, index) =>
    normalizeCandidateSchema(item, {
      index,
      warn: () => {},
    })
  );
  const split = news && signals ? {
    news: news.map((item, index) => normalizeCandidateSchema(item, { index, warn: () => {} })),
    signals: signals.map((item, index) => normalizeCandidateSchema(item, { index, warn: () => {} })),
  } : splitCandidates(normalizedAll);

  const sections = [
    '# Scored Candidates Audit',
    '',
    `Generated: ${timestamp}`,
    '',
    '## Overview',
    `- total_candidates: ${normalizedAll.length}`,
    `- news_candidates: ${split.news.length}`,
    `- signal_candidates: ${split.signals.length}`,
    '',
    '## News Score Bands',
    formatScoreBands(split.news),
    '',
    '## Source Family Distribution',
    formatSourceFamilyCounts(normalizedAll),
    '',
    '## Follow-Builders Breakdown',
    formatFollowBuildersBreakdown(normalizedAll),
    '',
    '## Candidates',
    '',
  ];

  const normalizedNewsUrls = new Set(split.news.map((item) => item.url || `news:${item.title}`));

  normalizedAll.forEach((item, index) => {
    const pool = normalizedNewsUrls.has(item.url || `news:${item.title}`) ? 'news' : 'signal';
    sections.push(formatCandidate(item, index, pool));
  });

  return sections.join('\n');
}

const args = parseArgs(process.argv);
if (!args.all || !args.output) {
  console.error('Usage: node generate-score-report.js --all scored.json [--news scored-news.json] [--signals scored-signals.json] --output scored-candidates.md');
  process.exit(1);
}

const all = loadJson(args.all);
const news = args.news ? loadJson(args.news) : null;
const signals = args.signals ? loadJson(args.signals) : null;
const report = buildReport(all, news, signals);

writeFileSync(args.output, report);
console.error(`[report] Wrote scored candidate report to ${args.output}`);
