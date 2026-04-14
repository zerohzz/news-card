#!/usr/bin/env node

/**
 * Multi-dimension scoring engine.
 * Formula: total = cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8
 *                + virality × 1.2 + actionability × 0.6 + peer_review × 3.0 + topic_adjustment × 1.0
 *
 * The `topic_adjustment` 8th dimension biases scoring toward XHS-suitable content:
 * technical/product/research stories and Chinese AI ecosystem get bonuses;
 * US-domestic political drama, unrest, medical/finance AI get soft penalties;
 * sovereignty red lines get a hard filter.
 *
 * Usage: node score-engine.js --input candidates.json --output scored.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { extractEntities, entitiesMatch, extractProperNouns, PROPER_NOUN_BLOCKLIST, ORG_PATTERNS } from './entities.js';
import { normalizeCandidateSchema } from './pipeline-utils.js';

// Known org canonical names — used to exclude well-known orgs from dynamic proper
// noun matching (rule 4). These orgs are already handled by static entity matching
// (rule 3) and are too common to serve as distinctive "unknown entity" signals.
const KNOWN_ORG_NAMES = new Set(ORG_PATTERNS.map(([, canonical]) => canonical));

// Weights
const W_CROSS = 2.0;
const W_COMMUNITY = 1.5;
const W_AUTHORITY = 1.0;
const W_RECENCY = 0.8;
const W_VIRALITY = 1.2;
const W_ACTIONABILITY = 0.6;
const W_PEER_REVIEW = 3.0;
const W_TOPIC = 1.0;

// ── Topic classifier (8th scoring dimension) ──────────────────────────────
// Biases scoring toward XHS-suitable content. First-match-wins priority.
// Sovereignty lines are hard-rejected (−20 ≈ drop to bottom of ranking).
// See references/scoring-spec.md for full rules.
function classifyTopic(item) {
  const text = (
    (item.title || '') + ' ' +
    (item.summary || '') + ' ' +
    (item.source || '')
  ).toLowerCase();

  // Sovereignty red line — hard rejection
  const SOVEREIGNTY = /\b(taiwan\s+independen|hong\s*kong\s+indepen|xinjiang|tibet\s+indepen|uyghur)\b|台独|港独|疆独|藏独|涉疆|西藏独立|台湾独立/i;

  // Unrest / personal safety / violence
  // Note: plain "attack" is too broad (matches "prompt injection attack"),
  // so we require it to be paired with a residence/person indicator.
  const UNREST = /\b(shooting|firebomb|riot|molotov|assassin|attack\s+on\s+(his|her|the)\s+(home|residence|house))\b|\bprotest(?:s|ers|ing|ed)?\b|枪击|袭击|抗议|示威|燃烧瓶|骚乱|游行/i;

  // US domestic politics
  const US_POLITICS = /\b(republican|democrat|senator|congress|white\s+house|pentagon|treasury|biden|trump\s+officials?)\b|两党|共和党|民主党|白宫|参议院|众议院|国防部|财政部|五角大楼/i;

  // Health/medical AI — XHS industry blacklist
  const HEALTH_AI = /\b(cancer|tumor|clinical|patient|diagnos|prescription|nhs|pharma)\b|医疗|诊疗|处方|疗效|肠癌|肿瘤|临床/i;

  // Consumer finance AI — excludes pure academic/paper contexts
  const FINANCE_AI = /\b(bank|banking|stock\s+market|trading|hedge\s+fund|insurance\s+firm|retail\s+investor)\b|银行|炒股|股价|理财|基金|保险公司/i;

  // Religion / faith ethics
  const RELIGION = /\b(christian|religious|clergy|pastor|bishop|islam|muslim|buddhist)\b|基督教|牧师|宗教|伊斯兰|佛教/i;

  // China-positive AI ecosystem
  const CHINA_AI_POS = /\b(qwen|deepseek|kimi|minimax|moonshot|glm|baichuan|stepfun|doubao|sensetime|ernie|wenxin|tongyi|hunyuan|ascend|cambricon|biren|zhipu)\b|通义|千问|智谱|百川|豆包|混元|文心|昇腾|寒武纪|阶跃|零一万物|商汤/i;

  // Technical / product / research content
  const TECH = /\b(launch|release|open[- ]?source|benchmark|api|sdk|model|paper|arxiv|framework|library|cli|runtime|repository|github|huggingface|architecture|alignment|rlhf)\b|发布|开源|模型|论文|框架|基准|评测/i;

  // Generic AI regulation / policy (not specifically US politics)
  const AI_REG = /\b(ai\s+act|ai\s+executive\s+order|ai\s+regulation|ai\s+policy)\b|AI法案|AI行政令/i;

  if (SOVEREIGNTY.test(text))  return { topic: 'sovereignty',       adjustment: -20 };
  if (UNREST.test(text))       return { topic: 'unrest',            adjustment: -4 };
  if (US_POLITICS.test(text))  return { topic: 'politics',          adjustment: -3 };
  if (HEALTH_AI.test(text))    return { topic: 'health_ai',         adjustment: -1 };
  if (FINANCE_AI.test(text))   return { topic: 'finance_ai',        adjustment: -1 };
  if (RELIGION.test(text))     return { topic: 'religion_ethics',   adjustment: -2 };
  if (CHINA_AI_POS.test(text)) return { topic: 'china_ai_positive', adjustment: +3 };
  if (TECH.test(text))         return { topic: 'tech',              adjustment: +2 };
  if (AI_REG.test(text))       return { topic: 'ai_reg',            adjustment: -1 };
  return                              { topic: 'neutral',           adjustment:  0 };
}

// X/Twitter source authority by tier.
const X_AUTHORITY_TIERS = {
  // Tier A: official/company
  claudeai: 4,
  sama: 4,
  openai: 4,
  anthropicai: 4,
  googleai: 4,
  deepmind: 4,
  demishassabis: 4,
  // Tier C: commentary/investor
  petergyang: 2,
  thenanyu: 2,
  madhuguru_: 2,
  garrytan: 2,
  mattturck: 2,
  zarazhang: 2,
};
const X_DEFAULT_AUTHORITY = 3; // Tier B: builder/practitioner

/**
 * Calculate recency score using exponential decay.
 * Replaces the step-function (3/2/1/0) with smooth decay to eliminate the 24h cliff.
 * Half-life = 8 hours: score halves every 8h. Below 0.2 → rounds to 0.
 */
function recencyScore(publishedISO) {
  const published = new Date(publishedISO);
  if (isNaN(published.getTime())) return 0;
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 0) return 0; // future dates
  const maxScore = 3;
  const halfLifeHours = 12;
  const minScore = 0.2;
  const lambda = Math.LN2 / halfLifeHours;
  const raw = maxScore * Math.exp(-lambda * hoursAgo);
  return raw < minScore ? 0 : Math.round(raw * 10) / 10;
}

/**
 * Calculate community heat score from metrics.
 */
function communityScore(metrics) {
  if (!metrics) return 0;
  let score = 0;

  // Hacker News
  const hnPoints = metrics.hn_points || 0;
  if (hnPoints > 500) score = Math.max(score, 6);
  else if (hnPoints > 300) score = Math.max(score, 4);
  else if (hnPoints > 100) score = Math.max(score, 2);

  // HuggingFace (raised thresholds — >20 upvotes is too common on HF daily papers)
  const hfUpvotes = metrics.hf_upvotes || 0;
  if (hfUpvotes > 80) score = Math.max(score, 4);
  else if (hfUpvotes > 30) score = Math.max(score, 2);

  // X/Twitter — follow-builders data already includes likes/comments
  const xLikes = metrics.likes || 0;
  if (xLikes >= 3000) score = Math.max(score, 6);
  else if (xLikes >= 1000) score = Math.max(score, 4);
  else if (xLikes >= 300) score = Math.max(score, 2);

  return score;
}

/**
 * Score virality based on community engagement metrics.
 */
function scoreVirality(item) {
  const metrics = item.community_metrics || {};
  const likes = metrics.likes || 0;

  // X/Twitter tweets — use likes as primary signal
  if (item.source?.startsWith('X/')) {
    if (likes >= 5000) return 5;
    if (likes >= 1000) return 4;
    if (likes >= 500) return 3;
    if (likes >= 100) return 2;
    return likes > 0 ? 1 : 0;
  }

  // HN, HF, general — use the best available metric
  const points = metrics.hn_points || metrics.hf_upvotes || metrics.score || 0;
  if (points >= 200) return 5;
  if (points >= 100) return 4;
  if (points >= 50) return 3;
  if (points >= 20) return 2;
  return points > 0 ? 1 : 0;
}

/**
 * Score actionability based on keywords in title and summary.
 */
function scoreActionability(item) {
  const text = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
  const highAction = /\b(launch\w*|release[sd]?|open.?source[sd]?|announc\w*|introduc\w*|available|free|open beta|shipp?\w*|deploy\w*|now available)\b/;
  const medAction = /\b(rais\w*|acquir\w*|partner\w*|invest\w*|fund\w*|merg\w*|hir\w*|expand\w*)\b/;

  let score = 1;
  if (highAction.test(text)) score = 3;
  else if (medAction.test(text)) score = 2;

  // Academic sources: "we introduce", "code available" ≠ product launch actionability
  const isAcademic = /huggingface|arxiv|papers/i.test(item.source || '');
  if (isAcademic && score === 3) return 2;

  return score;
}

/**
 * Tokenize a title for similarity comparison.
 */
function tokenize(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
    'to', 'for', 'of', 'and', 'or', 'but', 'with', 'by', 'from',
    'that', 'this', 'it', 'its', 'has', 'have', 'had', 'be', 'been',
    'will', 'can', 'could', 'would', 'should', 'may', 'might',
    'not', 'no', 'do', 'does', 'did', 'as', 'if', 'how', 'what',
    'which', 'who', 'when', 'where', 'why', 'new', 'first',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

/**
 * Jaccard similarity between two token sets.
 */
function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Extract key entities (company/org + product/model names) from title text.
 * Returns { org: Set, product: Set } of lowercased entity names.
 */
// Entity extraction and matching imported from shared module (entities.js)

/**
 * Map a source string to its canonical organization name.
 * Used to enforce "same org blog + twitter = 1 independent source."
 */
const SOURCE_ORG_MAP = new Map([
  ['openai blog', 'openai'], ['x/@openai', 'openai'], ['x/@sama', 'openai'],
  ['anthropic blog', 'anthropic'], ['x/@anthropicai', 'anthropic'], ['x/@claudeai', 'anthropic'],
  ['google ai blog', 'google'], ['deepmind blog', 'google'], ['x/@googleai', 'google'],
  ['x/@deepmind', 'google'], ['x/@demishassabis', 'google'],
  ['google research blog', 'google'],
  ['nvidia blog', 'nvidia'],
  ['meta ai blog', 'meta'],
  ['mistral blog', 'mistral'],
  ['blog/openai', 'openai'],
  ['blog/anthropic', 'anthropic'],
  ['blog/google', 'google'],
  ['blog/deepmind', 'google'],
  ['blog/nvidia', 'nvidia'],
  ['blog/meta', 'meta'],
  ['blog/mistral', 'mistral'],
]);

function sourceToOrg(source) {
  const lower = (source || '').toLowerCase();
  for (const [prefix, org] of SOURCE_ORG_MAP) {
    if (lower.startsWith(prefix)) return org;
  }
  return lower;
}

/**
 * Extract number-like tokens from text (dollar amounts, versions, percentages).
 * These are strong corroborating signals for event matching.
 * Returns Set<string> of lowercased number tokens.
 */
function extractNumberTokens(tokens) {
  const numbers = new Set();
  for (const t of tokens) {
    // Match: $500m, 500m, 9b, 3.5, v4, 2.5b, 100k, etc.
    if (/^\$?\d+(\.\d+)?[bmkt]?$/i.test(t) || /^v\d+/i.test(t)) {
      numbers.add(t);
    }
  }
  return numbers;
}

/**
 * Check if two items share any number tokens (funding amounts, versions, etc.).
 */
function hasSharedNumbers(tokensA, tokensB) {
  const numsA = extractNumberTokens(tokensA);
  if (numsA.size === 0) return false;
  const numsB = extractNumberTokens(tokensB);
  for (const n of numsA) {
    if (numsB.has(n)) return true;
  }
  return false;
}

/**
 * Group items by event similarity for cross-validation scoring.
 *
 * Matching pipeline (all OR'd):
 * 1. Same normalized URL (highest precision, zero false positives)
 * 2. Title Jaccard > 0.2 (unchanged from original)
 * 3. Static entity match via entitiesMatch() (expanded lists + relaxed threshold)
 * 4. Shared proper noun + Jaccard > 0.1 (dynamic entity detection)
 * 5. Shared rare token + Jaccard > 0.1 (compound weak signals)
 */
function groupByEvent(items) {
  const groups = [];
  const assigned = new Set();

  // Pre-compute tokens, entities, proper nouns, and normalized URLs
  const precomputed = items.map((item) => ({
    tokens: tokenize(item.title),
    entities: extractEntities((item.title || '') + ' ' + (item.summary || '')),
    properNouns: extractProperNouns(item.title || ''),
    normalizedUrl: normalizeUrl(item.url || ''),
  }));

  // Compute document frequency for rare token detection.
  // A "rare token" appears in very few items — it's a distinctive signal.
  const docFreq = new Map();
  for (const { tokens } of precomputed) {
    const unique = new Set(tokens);
    for (const t of unique) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }
  const rareThreshold = Math.max(3, Math.ceil(items.length * 0.05));

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;

    const group = [i];

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;

      let matched = false;

      // 1. URL match — if both point to the same URL, it's the same event
      if (precomputed[i].normalizedUrl && precomputed[j].normalizedUrl
          && precomputed[i].normalizedUrl === precomputed[j].normalizedUrl) {
        matched = true;
      }

      if (!matched) {
        const titleSim = jaccardSimilarity(precomputed[i].tokens, precomputed[j].tokens);

        // 2. Title Jaccard > 0.2 (original threshold)
        if (titleSim > 0.2) {
          matched = true;
        }

        if (!matched) {
          // 3. Static entity match (now with sharedNumber corroboration)
          const sharedNumber = hasSharedNumbers(precomputed[i].tokens, precomputed[j].tokens);
          const entityMatch = entitiesMatch(
            precomputed[i].entities, precomputed[j].entities,
            titleSim, { sharedNumber }
          );
          if (entityMatch) {
            matched = true;
          }
        }

        if (!matched && titleSim > 0.1) {
          // 4. Dynamic proper noun overlap + minimal title similarity
          // If two titles share a capitalized proper noun and have some lexical overlap,
          // they likely cover the same entity's event.
          // Known orgs (OpenAI, Google, etc.) are excluded — they appear across many
          // unrelated stories and are already handled by static entity matching (rule 3).
          const pnI = precomputed[i].properNouns;
          const pnJ = precomputed[j].properNouns;
          if (pnI.size > 0 && pnJ.size > 0) {
            for (const noun of pnI) {
              if (pnJ.has(noun) && !KNOWN_ORG_NAMES.has(noun)) {
                matched = true;
                break;
              }
            }
          }

          // 5. Shared rare token + minimal title similarity
          // Rare tokens (e.g., specific dollar amounts, person names, niche terms)
          // appearing in very few items are strong signals of the same event.
          // Common words and known org names are excluded — they can appear
          // across unrelated stories and seem "rare" only due to small dataset size.
          if (!matched) {
            const tokensI = new Set(precomputed[i].tokens);
            const tokensJ = new Set(precomputed[j].tokens);
            for (const t of tokensI) {
              if (tokensJ.has(t)
                  && (docFreq.get(t) || 0) <= rareThreshold
                  && !PROPER_NOUN_BLOCKLIST.has(t)
                  && !KNOWN_ORG_NAMES.has(t)) {
                matched = true;
                break;
              }
            }
          }
        }
      }

      if (matched) {
        group.push(j);
        assigned.add(j);
      }
    }

    assigned.add(i);
    groups.push(group);
  }

  return groups;
}

/**
 * Normalize a URL for comparison (strip protocol, www, trailing slashes, query params).
 */
function normalizeUrl(url) {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\?.*$/, '').replace(/^www\./, '').toLowerCase();
}

/**
 * Extract title words as a Set for similarity comparison.
 */
function titleWords(title) {
  return new Set((title || '').toLowerCase().split(/[\s\-–—:,;.!?()[\]{}'"]+/).filter(w => w.length > 2));
}

/**
 * Jaccard similarity between two Sets.
 */
function jaccardSimilarityPeer(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) { if (setB.has(w)) intersection++; }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Extract entity names from candidate for cross-language matching.
 * Uses the same extractEntities from entities.js.
 */
function candidateEntityNames(item) {
  const ent = extractEntities((item.title || '') + ' ' + (item.summary || ''));
  return new Set([...ent.orgs, ...ent.products]);
}

/**
 * Score peer review based on newsletter signal matches.
 * Supports both English (title Jaccard) and Chinese (entity-based) matching.
 */
function scorePeerReview(item, signals) {
  if (!signals || signals.length === 0) return 0;

  const candidateUrl = normalizeUrl(item.url || item.source_url || '');
  const candidateWords = titleWords(item.title || '');
  const candidateEntities = candidateEntityNames(item);
  let mentionCount = 0;
  let weightedSum = 0;

  for (const newsletter of signals) {
    let mentioned = false;
    const isChinese = newsletter.lang === 'zh';

    for (const signal of newsletter.items) {
      // Primary: URL match (EN sources only — CN sources rarely share URLs)
      if (!isChinese && candidateUrl && signal.url && normalizeUrl(signal.url) === candidateUrl) {
        mentioned = true;
        break;
      }

      if (isChinese) {
        // Chinese matching: use cn_entities extracted during fetch
        // Require ≥2 shared entities, OR 1 entity + title keyword overlap
        // Single-entity matches (e.g. just "OpenAI") are too loose
        const cnEnts = signal.cn_entities || [];
        if (cnEnts.length > 0) {
          const shared = cnEnts.filter(e => candidateEntities.has(e));
          if (shared.length >= 2) {
            mentioned = true;
            break;
          }
          // 1 shared entity + title keyword overlap as fallback
          if (shared.length === 1) {
            const signalTitleWords = titleWords(signal.title || '');
            if (jaccardSimilarityPeer(candidateWords, signalTitleWords) > 0.15) {
              mentioned = true;
              break;
            }
          }
        }
      } else {
        // English matching strategy 1: URL match (handled above)
        // Strategy 2: title word Jaccard
        const signalWords = titleWords(signal.title);
        const jaccThreshold = signalWords.size <= 5 ? 0.3 : 0.4;
        if (jaccardSimilarityPeer(candidateWords, signalWords) > jaccThreshold) {
          mentioned = true;
          break;
        }
        // Strategy 3: entity-based matching for EN newsletters
        // If signal and candidate share ≥1 org+product or ≥2 entities, match
        const signalEntities = extractEntities(signal.title || '');
        const sharedOrgs = [...signalEntities.orgs].filter(o => candidateEntities.has(o));
        const sharedProducts = [...signalEntities.products].filter(p => candidateEntities.has(p));
        if (sharedOrgs.length >= 1 && sharedProducts.length >= 1) {
          mentioned = true;
          break;
        }
        if (sharedOrgs.length + sharedProducts.length >= 2) {
          mentioned = true;
          break;
        }
        // Strategy 4: containment match for keyword-style signals (TLDR)
        if (signalWords.size >= 2 && signalWords.size <= 8) {
          const fullWords = titleWords((item.title || '') + ' ' + (item.summary || ''));
          let contained = 0;
          for (const w of signalWords) { if (fullWords.has(w)) contained++; }
          const threshold = signalWords.size <= 3 ? 1.0 : 0.6;
          if (contained / signalWords.size >= threshold) {
            mentioned = true;
            break;
          }
        }
      }
    }
    if (mentioned) {
      // Weight by source authority: high-authority newsletters count more
      const auth = newsletter.authority || 3;
      const weight = auth >= 5 ? 1.5 : auth >= 4 ? 1.2 : auth >= 3 ? 1.0 : 0.7;
      weightedSum += weight;
      mentionCount++;
    }
  }

  // Map weighted sum to 0–5 score (preserves existing range + W_PEER_REVIEW = 3.0)
  if (weightedSum >= 4.0) return 5;
  if (weightedSum >= 3.0) return 4;
  if (weightedSum >= 2.0) return 3;
  if (weightedSum >= 0.5) return 2;
  return 0;
}

/**
 * Score all candidates.
 */
function scoreAll(candidates, newsletterSignals) {
  const normalizedCandidates = candidates.map((candidate, index) =>
    normalizeCandidateSchema(candidate, {
      index,
      warn: (message) => console.error(message),
    })
  );

  // Group by event for cross-validation
  const eventGroups = groupByEvent(normalizedCandidates);

  // Build cross-validation map: item index → number of independent sources covering same event
  const crossMap = new Map();
  for (const group of eventGroups) {
    // Count unique organizations (not just source strings) for independent source counting
    const orgs = new Set(group.map((idx) => sourceToOrg(normalizedCandidates[idx].source)));
    for (const idx of group) {
      crossMap.set(idx, orgs.size);
    }
  }

  // Score each candidate
  const scored = normalizedCandidates.map((item, idx) => {
    const sourceCount = crossMap.get(idx) || 1;
    const crossValidation = Math.min(sourceCount > 1 ? (sourceCount - 1) * 3 : 0, 12);
    const community = communityScore(item.community_metrics);
    let authority = item.source_authority || 3;
    // Apply X tier-based authority override.
    if (item.source && item.source.startsWith('X/')) {
      const handle = item.source.replace(/^X\/@?/, '').split(' ')[0].toLowerCase();
      authority = X_AUTHORITY_TIERS[handle] ?? X_DEFAULT_AUTHORITY;
    }
    // Curated builder bonus: follow-builders X accounts are hand-picked, +1 authority
    const isCuratedBuilder = item.source_collection === 'follow-builders'
      && item.source_family === 'follow_builders_x';
    if (isCuratedBuilder) authority = Math.min(authority + 1, 5);
    const recency = recencyScore(item.published);
    const virality = scoreVirality(item);
    const actionability = scoreActionability(item);
    const peerReview = scorePeerReview(item, newsletterSignals);

    let totalScore =
      crossValidation * W_CROSS +
      community * W_COMMUNITY +
      authority * W_AUTHORITY +
      recency * W_RECENCY +
      virality * W_VIRALITY +
      actionability * W_ACTIONABILITY +
      peerReview * W_PEER_REVIEW;

    const isXOnly = item.source?.startsWith('X/') && crossValidation === 0;

    // X-only cap: tiered by community heat (curated builders with viral posts deserve higher caps)
    if (isXOnly) {
      if (community >= 6) totalScore = Math.min(totalScore, 18);
      else if (community >= 4) totalScore = Math.min(totalScore, 15);
      else totalScore = Math.min(totalScore, 11.9);
    }

    // 8th dimension — topic_adjustment applied AFTER caps so penalties still bite X-only drama.
    const topic = classifyTopic(item);
    const topicAdjustment = topic.adjustment * W_TOPIC;
    totalScore += topicAdjustment;

    // Find related sources from the same event group
    const eventGroup = eventGroups.find((g) => g.includes(idx)) || [idx];
    const relatedSources = eventGroup
      .filter((i) => i !== idx)
      .map((i) => ({ source: normalizedCandidates[i].source, url: normalizedCandidates[i].url }));

    return {
      ...item,
      topic_hint: topic.topic,
      scores: {
        cross_validation: crossValidation,
        community_heat: community,
        authority,
        recency,
        virality,
        actionability,
        peer_review: peerReview,
        topic_adjustment: topic.adjustment,
        total: Math.round(totalScore * 10) / 10,
        x_only: isXOnly,
        requires_confirmation: item.requires_confirmation || isXOnly,
      },
      related_sources: relatedSources,
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.scores.total - a.scores.total);

  return scored;
}

// CLI entry point
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const outputIdx = args.indexOf('--output');
const signalsIdx = args.indexOf('--signals');
const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution && inputIdx === -1) {
  console.error('Usage: node score-engine.js --input candidates.json [--output scored.json] [--signals newsletter-signals.json]');
  process.exit(1);
}

const inputFile = args[inputIdx + 1];
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;
const signalsPath = signalsIdx !== -1 ? args[signalsIdx + 1] : null;

let newsletterSignals = [];
if (signalsPath) {
  try {
    const data = JSON.parse(readFileSync(signalsPath, 'utf-8'));
    newsletterSignals = data.signals || [];
    console.error(`[score] Loaded ${newsletterSignals.length} newsletter signal sources`);
  } catch (err) {
    console.error(`[score] Warning: could not load signals: ${err.message}`);
  }
}

if (isDirectExecution) {
  const candidates = JSON.parse(readFileSync(inputFile, 'utf-8'));
  const scored = scoreAll(candidates, newsletterSignals);

  console.error(`[score] Scored ${scored.length} candidates`);
  console.error(`[score] Score distribution: ≥12: ${scored.filter((s) => s.scores.total >= 12).length}, ≥6: ${scored.filter((s) => s.scores.total >= 6).length}, <6: ${scored.filter((s) => s.scores.total < 6).length}`);

  const output = JSON.stringify(scored, null, 2);
  if (outputFile) {
    writeFileSync(outputFile, output);
    console.error(`[score] Wrote to ${outputFile}`);
  } else {
    process.stdout.write(output);
  }
}

export { scoreAll, tokenize, jaccardSimilarity, extractEntities, extractProperNouns, sourceToOrg, classifyTopic };
