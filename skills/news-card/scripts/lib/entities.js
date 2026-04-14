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
  // Extended coverage — companies frequently seen in AI news
  [/\bxai\b/, 'xai'], [/\bx\.ai\b/, 'xai'],
  [/\bcohere\b/, 'cohere'],
  [/\bperplexity\b/, 'perplexity'],
  [/\bdatabricks\b/, 'databricks'],
  [/\bscale\s*ai\b/, 'scale'],
  [/\bai21\s*labs?\b/, 'ai21'],
  [/\binflection\s*ai\b/, 'inflection'], [/\binflection\b(?=.*\b(model|launch|release|pi\b))/, 'inflection'],
  [/\bcharacter\s*\.?ai\b/, 'character'],
  [/\btogether\s*ai\b/, 'together'],
  [/\bfireworks\s*ai\b/, 'fireworks'],
  [/\breplicate\b/, 'replicate'],
  [/\bgroq\b/, 'groq'],
  [/\bcerebras\b/, 'cerebras'],
  [/\bsambanova\b/, 'sambanova'],
  [/\bzhipu\b/, 'zhipu'], [/智谱/, 'zhipu'],
  [/\bmoonshot\b/, 'moonshot'], [/月之暗面/, 'moonshot'],
  [/\bminimax\b/, 'minimax'],
  [/\bbaichuan\b/, 'baichuan'], [/百川/, 'baichuan'],
  [/\b01\.?ai\b/, '01ai'], [/零一万物/, '01ai'],
  [/\bstepfun\b/, 'stepfun'], [/阶跃星辰/, 'stepfun'],
  [/\bsensetime\b/, 'sensetime'], [/商汤/, 'sensetime'],
  [/\brecraft\b/, 'recraft'],
  [/\bideogram\b/, 'ideogram'],
  [/\bamazon\b/, 'amazon'], [/\baws\b/, 'amazon'],
  [/\bbaidu\b/, 'baidu'], [/百度/, 'baidu'],
  [/\btencent\b/, 'tencent'], [/腾讯/, 'tencent'],
  [/\bbytedance\b/, 'bytedance'], [/字节跳动/, 'bytedance'],
  [/\bsamsung\b/, 'samsung'],
  [/\bsalesforce\b/, 'salesforce'],
  [/\boracle\b/, 'oracle'],
  [/\bsnowflake\b/, 'snowflake'],
  [/\barcee\s*ai\b/, 'arcee'],
  [/\bwriter\b(?=.*\b(ai|model|launch|release))/, 'writer'],
  [/\badept\b/, 'adept'],
  [/\bcognition\b(?=.*\b(ai|devin|lab))/, 'cognition'],
  [/\bpika\b/, 'pika'],
  [/\bluma\s*ai\b/, 'luma'],
  [/\bworldcoin\b/, 'worldcoin'],
  [/\bpool\s*side\b/, 'poolside'],
  [/\bmagic\s*ai\b/, 'magic'],
];

// Product names — matched with word boundaries to avoid substring collisions.
// Sorted longest-first so "gpt-4o" matches before "gpt-4".
export const PRODUCT_PATTERNS = [
  'gpt-5', 'gpt-4o', 'gpt-4', 'chatgpt',
  'claude 4', 'claude 3', 'claude code', 'claude',
  'gemini 2.5', 'gemini pro', 'gemini',
  'llama 4', 'llama 3', 'llama',
  'mistral large', 'codestral',
  'copilot workspace', 'copilot agent', 'copilot',
  'alphafold 3', 'alphafold',
  'blackwell', 'b300',
  'phi-4', 'phi-3',
  'sam 3', 'sam 2',
  'gen-4', 'gen-3',
  'stable diffusion',
  'aquila', 'deepseek',
  'sora', 'dall-e',
  // Extended coverage — products frequently seen in AI news
  'grok 3', 'grok 2', 'grok',
  'gemma 3', 'gemma 2', 'gemma',
  'command r+', 'command r',
  'o4-mini', 'o3-mini', 'o3', 'o1',
  'qwen 3', 'qwen 2.5', 'qwen',
  'glm-4', 'glm',
  'ernie', 'wenxin',
  'yi-lightning', 'yi',
  'devin',
  'windsurf',
  'cursor tab',
  'flux',
  'midjourney',
  'firefly',
  'kling',
  'suno',
  'udio',
  'pi',
  'perplexity',
  'hunyuan',
].map(p => ({ re: new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), name: p }));

// Common words that should NOT be treated as proper nouns even when capitalized.
// Includes sentence-start words, generic tech terms, and common adjectives/nouns.
export const PROPER_NOUN_BLOCKLIST = new Set([
  // Sentence-start / title-case common words
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'its',
  'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'with',
  'by', 'from', 'as', 'if', 'how', 'what', 'which', 'who', 'when',
  'where', 'why', 'new', 'first', 'after', 'before', 'now', 'just',
  'also', 'more', 'most', 'all', 'some', 'any', 'other', 'many',
  'will', 'can', 'could', 'would', 'should', 'may', 'might', 'has',
  'have', 'had', 'been', 'being', 'was', 'were', 'are', 'is', 'be',
  'not', 'no', 'do', 'does', 'did', 'get', 'gets', 'got', 'let',
  'here', 'there', 'every', 'each', 'both', 'few', 'own', 'same',
  'still', 'already', 'even', 'yet', 'too', 'very', 'really',
  'about', 'over', 'under', 'into', 'through', 'between', 'during',
  'against', 'up', 'down', 'out', 'off', 'away', 'back',
  'while', 'until', 'since', 'because', 'although', 'though',
  'says', 'said', 'according', 'report', 'reports', 'reportedly',
  'may', 'could', 'set', 'big', 'top', 'best', 'next', 'last',
  'using', 'based', 'amid', 'via',
  // Generic tech / AI terms
  'ai', 'api', 'sdk', 'llm', 'gpu', 'cpu', 'ml', 'nlp', 'rl',
  'model', 'models', 'agent', 'agents', 'tool', 'tools',
  'launch', 'launches', 'launched', 'release', 'releases', 'released',
  'update', 'updates', 'updated', 'feature', 'features',
  'open', 'source', 'data', 'training', 'system', 'research',
  'announces', 'announced', 'unveils', 'unveiled', 'reveals', 'revealed',
  'introduces', 'introduced',
  'platform', 'startup', 'startups', 'company', 'companies',
  'billion', 'million', 'funding', 'round', 'series', 'raise',
  'raises', 'raised', 'valued', 'valuation',
  'enterprise', 'business', 'users', 'developers', 'partners',
  'world', 'global', 'team', 'teams', 'year', 'years',
  'pro', 'plus', 'free', 'beta', 'preview', 'available',
  // Days/months that appear capitalized
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'january', 'february', 'march', 'april', 'june', 'july',
  'august', 'september', 'october', 'november', 'december',
]);

/**
 * Extract capitalized proper nouns from text as candidate entities.
 * Catches brand-new companies/products not in the hardcoded lists.
 * Returns Set<string> of lowercased proper noun tokens.
 *
 * Strategy: find words that start with uppercase in their original form,
 * excluding words at sentence boundaries and common English words.
 */
export function extractProperNouns(originalText) {
  if (!originalText) return new Set();

  const nouns = new Set();

  // Match capitalized words that aren't at sentence start.
  // We look for words preceded by a lowercase letter, space, comma, etc. — not after ". " or start-of-string.
  // Also match ALL-CAPS tokens of 2-8 chars (acronyms like "xAI", "DALL-E").
  const words = originalText.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const raw = words[i].replace(/[^a-zA-Z0-9\-.']/g, '');
    if (!raw || raw.length < 2) continue;

    const lower = raw.toLowerCase();
    if (PROPER_NOUN_BLOCKLIST.has(lower)) continue;

    // Skip pure numbers or very short tokens
    if (/^\d+$/.test(raw)) continue;
    if (raw.length < 3 && !/^[A-Z]/.test(raw)) continue;

    const isCapitalized = /^[A-Z]/.test(raw);
    const isAcronym = /^[A-Z]{2,8}$/.test(raw);
    const isCamelCase = /^[a-z]+[A-Z]/.test(raw); // e.g., "xAI", "DeepSeek"

    if (isCapitalized || isAcronym || isCamelCase) {
      // The blocklist handles common words that appear capitalized at sentence start.
      // No special first-word filtering needed — in news headlines, the first word
      // is frequently the entity name (e.g., "Nexora Launches...", "Perplexity Raises...").
      nouns.add(lower);
    }
  }

  return nouns;
}

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

  return { orgs, products };
}

/**
 * Check if two items likely cover the same event using entity overlap.
 * Returns true if they share at least one org AND one product,
 * or share at least 2 products.
 * Also accepts titleJaccard as optional context — shared org + moderate title
 * similarity indicates same event for non-product news (funding, policy).
 *
 * @param {object} entA - { orgs: Set, products: Set }
 * @param {object} entB - { orgs: Set, products: Set }
 * @param {number} titleJaccard - title token Jaccard similarity (0-1)
 * @param {object} options - additional matching context
 * @param {boolean} options.sharedNumber - whether titles share a specific number
 */
export function entitiesMatch(entA, entB, titleJaccard = 0, options = {}) {
  const sharedOrgs = [...entA.orgs].filter(o => entB.orgs.has(o));
  const sharedProducts = [...entA.products].filter(p => entB.products.has(p));

  if (sharedOrgs.length >= 1 && sharedProducts.length >= 1) return true;
  if (sharedProducts.length >= 2) return true;
  // Shared org + moderate title similarity → same event (e.g., funding news)
  if (sharedOrgs.length >= 1 && titleJaccard > 0.3) return true;
  // Relaxed: shared org + lower Jaccard when corroborated by a shared number
  // e.g., both mention "Perplexity" and "$500M" → clearly same funding event
  if (sharedOrgs.length >= 1 && titleJaccard > 0.15 && options.sharedNumber) return true;
  return false;
}
