/**
 * Shared source-family and schema utilities for the news-card pipeline.
 */

export const SOURCE_FAMILIES = Object.freeze({
  CORE_RSS: 'core_rss',
  COMMUNITY_SIGNAL: 'community_signal',
  RESEARCH_SIGNAL: 'research_signal',
  FOLLOW_BUILDERS_X: 'follow_builders_x',
  FOLLOW_BUILDERS_PODCAST: 'follow_builders_podcast',
  FOLLOW_BUILDERS_BLOG: 'follow_builders_blog',
  NEWSLETTER_SIGNAL: 'newsletter_signal',
});

export const FOLLOW_BUILDERS_FAMILIES = new Set([
  SOURCE_FAMILIES.FOLLOW_BUILDERS_X,
  SOURCE_FAMILIES.FOLLOW_BUILDERS_PODCAST,
  SOURCE_FAMILIES.FOLLOW_BUILDERS_BLOG,
]);

export const SIGNAL_SOURCE_FAMILIES = new Set([
  SOURCE_FAMILIES.FOLLOW_BUILDERS_X,
  SOURCE_FAMILIES.COMMUNITY_SIGNAL,
  SOURCE_FAMILIES.RESEARCH_SIGNAL,
]);

export function inferSourceFamily(item) {
  if (item?.source_family) return item.source_family;

  const source = item?.source || '';
  if (source.startsWith('X/')) return SOURCE_FAMILIES.FOLLOW_BUILDERS_X;
  if (source.startsWith('Podcast/')) return SOURCE_FAMILIES.FOLLOW_BUILDERS_PODCAST;
  if (source.startsWith('Blog/')) return SOURCE_FAMILIES.FOLLOW_BUILDERS_BLOG;
  if (source === 'Hacker News') return SOURCE_FAMILIES.COMMUNITY_SIGNAL;
  if (source === 'HuggingFace Papers') return SOURCE_FAMILIES.RESEARCH_SIGNAL;
  return SOURCE_FAMILIES.CORE_RSS;
}

export function defaultSourceCollection(sourceFamily) {
  if (FOLLOW_BUILDERS_FAMILIES.has(sourceFamily)) return 'follow-builders';
  if (sourceFamily === SOURCE_FAMILIES.NEWSLETTER_SIGNAL) return 'editorial-consensus';
  return 'direct';
}

export function normalizeCandidateSchema(item, options = {}) {
  const {
    index = '?',
    warn = (message) => console.error(message),
  } = options;

  const normalized = { ...item };

  if (!normalized.title) {
    warn(`[schema] Candidate ${index}: missing title`);
    normalized.title = '';
  }
  if (!normalized.url) {
    warn(`[schema] Candidate ${index}: missing url`);
    normalized.url = '';
  }
  if (!normalized.source) {
    warn(`[schema] Candidate ${index}: missing source`);
    normalized.source = 'Unknown Source';
  }
  if (!normalized.published) {
    warn(`[schema] Candidate ${index}: missing published timestamp; using now`);
    normalized.published = new Date().toISOString();
  }
  if (!normalized.fetch_strategy) {
    warn(`[schema] Candidate ${index}: missing fetch_strategy; defaulting to metadata`);
    normalized.fetch_strategy = 'metadata';
  }

  if (normalized.source_authority == null && normalized.authority != null) {
    warn(`[schema] Candidate ${index}: legacy authority field detected on ${normalized.source}; normalizing to source_authority`);
    normalized.source_authority = normalized.authority;
  }
  if (normalized.source_authority == null || Number.isNaN(Number(normalized.source_authority))) {
    warn(`[schema] Candidate ${index}: missing source_authority on ${normalized.source}; defaulting to 3`);
    normalized.source_authority = 3;
  } else {
    normalized.source_authority = Number(normalized.source_authority);
  }

  normalized.summary ??= '';
  normalized.community_metrics ??= {};
  normalized.requires_confirmation = Boolean(normalized.requires_confirmation);
  normalized.source_family = inferSourceFamily(normalized);
  normalized.source_collection ||= defaultSourceCollection(normalized.source_family);

  return normalized;
}

export function isSignalCandidate(item) {
  return SIGNAL_SOURCE_FAMILIES.has(item?.source_family || inferSourceFamily(item));
}

export function splitCandidates(items) {
  const normalized = items.map((item) => ({
    ...item,
    source_family: item.source_family || inferSourceFamily(item),
    source_collection: item.source_collection || defaultSourceCollection(item.source_family || inferSourceFamily(item)),
  }));

  return {
    news: normalized.filter((item) => !isSignalCandidate(item)),
    signals: normalized.filter((item) => isSignalCandidate(item)),
  };
}

export function countBySourceFamily(items) {
  const counts = new Map();
  for (const item of items) {
    const family = item.source_family || inferSourceFamily(item);
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sourceFamily, count]) => ({ source_family: sourceFamily, count }));
}
