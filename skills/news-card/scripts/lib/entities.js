/**
 * Shared entity extraction and matching for score-engine and dedup.
 * Single source of truth for org/product patterns and matching logic.
 */

// Org keywords that require word-boundary matching to avoid substring false positives.
// Each entry: [regex, canonical_org]
export const ORG_PATTERNS = [
  [/\bopenai\b/, 'openai'],
  [/\banthropic\b/, 'anthropic'],
  [/\bgoogle\b/, 'google'], [/\bdeepmind\b/, 'google'],
  [/\bmeta ai\b/, 'meta'], [/\bmeta\b(?=.*\b(release|announce|launch|model|llama|sam\s*\d))/, 'meta'],
  [/\bmicrosoft\b/, 'microsoft'], [/\bgithub\b/, 'microsoft'],
  [/\bnvidia\b/, 'nvidia'],
  [/\bapple\b/, 'apple'],
  [/\bmistral\b/, 'mistral'],
  [/\bstability\s*ai\b/, 'stability'],
  [/\bhugging\s*face\b/, 'huggingface'],
  [/\bcursor\b/, 'cursor'],
  [/\brunway\b/, 'runway'], [/\brunwayml\b/, 'runway'],
  [/\bfigure\s*ai\b/, 'figure'],
  [/\bbaai\b/, 'baai'],
  [/\bdeepseek\b/, 'deepseek'],
  [/\bx\.?ai\b/, 'xai'], [/\bgrok\b/, 'xai'],
];

// Product names — matched with word boundaries to avoid substring collisions.
// Sorted longest-first so "gpt-4o" matches before "gpt-4".
export const PRODUCT_PATTERNS = [
  'gpt-5', 'gpt-4o', 'gpt-4', 'chatgpt',
  'claude 4', 'claude 3', 'claude',
  'gemini 2.5', 'gemini pro', 'gemini',
  'llama 4', 'llama 3', 'llama',
  'mistral large',
  'copilot agent', 'copilot',
  'alphafold 3', 'alphafold',
  'blackwell', 'b300',
  'phi-4', 'phi-3',
  'sam 3', 'sam 2',
  'gen-4', 'gen-3',
  'stable diffusion',
  'aquila', 'deepseek',
  'sora', 'dall-e',
  'grok',
].map(p => ({ re: new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), name: p }));

// Person-to-org mappings — resolves CEO/founder names to their affiliated org.
// Last-name-only for distinctive names; full name for ambiguous ones.
export const PERSON_ORG_MAP = [
  // OpenAI
  [/\baltman\b/, 'openai'],
  [/\bbrockman\b/, 'openai'],
  // Anthropic
  [/\bamodei\b/, 'anthropic'],
  // Meta
  [/\bzuckerberg\b/, 'meta'],
  [/\blecun\b/, 'meta'],
  // Google / DeepMind
  [/\bhassabis\b/, 'google'],
  [/\bpichai\b/, 'google'],
  // Microsoft
  [/\bnadella\b/, 'microsoft'],
  // NVIDIA
  [/\bjensen\s+huang\b/, 'nvidia'],
  // Mistral
  [/\bmensch\b/, 'mistral'],
  // xAI
  [/\bmusk\b/, 'xai'],
];

/**
 * Extract key entities (company/org + product/model names) from text.
 * Returns { orgs: Set, products: Set } of lowercased entity names.
 */
export function extractEntities(text) {
  const lower = text.toLowerCase();
  const orgs = new Set();
  const products = new Set();

  for (const [re, canonical] of ORG_PATTERNS) {
    if (re.test(lower)) orgs.add(canonical);
  }
  for (const { re, name } of PRODUCT_PATTERNS) {
    if (re.test(lower)) products.add(name);
  }
  for (const [re, canonical] of PERSON_ORG_MAP) {
    if (re.test(lower)) orgs.add(canonical);
  }

  return { orgs, products };
}

/**
 * Check if two items likely cover the same event using entity overlap.
 * Returns true if they share at least one org AND one product,
 * or share at least 2 products.
 * Also accepts titleJaccard as optional context — shared org + title similarity
 * indicates same event for non-product news (funding, policy, person-org variants).
 *
 * @param {number} orgJaccardFloor - min titleJaccard for the shared-org path.
 *   Cross-validation uses 0.15 (lenient); dedup should pass 0.3 (stricter).
 */
export function entitiesMatch(entA, entB, titleJaccard = 0, orgJaccardFloor = 0.15) {
  const sharedOrgs = [...entA.orgs].filter(o => entB.orgs.has(o));
  const sharedProducts = [...entA.products].filter(p => entB.products.has(p));

  if (sharedOrgs.length >= 1 && sharedProducts.length >= 1) return true;
  if (sharedProducts.length >= 2) return true;
  // Shared org + title similarity above floor → same event
  if (sharedOrgs.length >= 1 && titleJaccard > orgJaccardFloor) return true;
  return false;
}
