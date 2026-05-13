#!/usr/bin/env node

/**
 * Render digest.json into HTML files using templates.
 * Usage: node render-html.js --input digest.json --templates ./templates --output ./html
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';

// Category → color mapping (from design-tokens.md)
const CATEGORY_COLORS = {
  '模型发布': '#4A90D9',
  '产品应用': '#7B68EE',
  '可信对齐': '#E74C3C',
  '行业动态': '#F39C12',
  '开发工具': '#2ECC71',
  '研究前沿': '#1ABC9C',
  '开源生态': '#E67E22',
  '政策监管': '#95A5A6',
  '劳力影响': '#8E44AD',
};

/**
 * Find the matching {{/each}} for a {{#each}} block, handling nesting.
 * Returns the index of the start of the matching {{/each}} tag.
 */
function findMatchingEnd(str, startAfterOpen, tag = 'each') {
  const openRe = new RegExp(`\\{\\{#${tag}\\s+\\w+\\}\\}`, 'g');
  const closeRe = new RegExp(`\\{\\{/${tag}\\}\\}`, 'g');
  let depth = 1;
  let pos = startAfterOpen;

  while (depth > 0 && pos < str.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const nextOpen = openRe.exec(str);
    const nextClose = closeRe.exec(str);

    if (!nextClose) return -1; // unmatched

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) return nextClose.index;
      pos = nextClose.index + nextClose[0].length;
    }
  }
  return -1;
}

/**
 * Recursively render template blocks with context stack support.
 */
function renderTemplate(template, data, parentData) {
  let result = '';
  let cursor = 0;

  while (cursor < template.length) {
    // Look for next {{#each}} or {{#if}}
    const eachMatch = template.slice(cursor).match(/\{\{#each\s+(\w+)\}\}/);
    const ifMatch = template.slice(cursor).match(/\{\{#if\s+(\w+)\}\}/);

    // Find the nearest block start
    let nextBlock = null;
    if (eachMatch && ifMatch) {
      nextBlock = eachMatch.index <= ifMatch.index ? { type: 'each', match: eachMatch } : { type: 'if', match: ifMatch };
    } else if (eachMatch) {
      nextBlock = { type: 'each', match: eachMatch };
    } else if (ifMatch) {
      nextBlock = { type: 'if', match: ifMatch };
    }

    if (!nextBlock) {
      // No more blocks — render remaining as plain text with variable substitution
      result += template.slice(cursor);
      break;
    }

    const blockStart = cursor + nextBlock.match.index;
    const tagEnd = blockStart + nextBlock.match[0].length;
    const key = nextBlock.match[1];

    // Add text before this block
    result += template.slice(cursor, blockStart);

    // Find matching close tag
    const closeIdx = findMatchingEnd(template, tagEnd, nextBlock.type);
    if (closeIdx === -1) {
      // Unmatched — output raw
      result += nextBlock.match[0];
      cursor = tagEnd;
      continue;
    }

    const inner = template.slice(tagEnd, closeIdx);
    const closeTagLen = nextBlock.type === 'each' ? '{{/each}}'.length : '{{/if}}'.length;

    if (nextBlock.type === 'each') {
      const items = data[key] || [];
      for (const item of items) {
        // Recursively render inner block with item as data, current data as parent
        const rendered = renderTemplate(inner, item, data);
        result += rendered;
      }
    } else if (nextBlock.type === 'if') {
      if (data[key]) {
        result += renderTemplate(inner, data, parentData);
      }
    }

    cursor = closeIdx + closeTagLen;
  }

  // Replace {{../var}} — parent context
  if (parentData) {
    result = result.replace(/\{\{\.\.\/(\w+)\}\}/g, (m, k) => {
      return parentData[k] !== undefined ? String(parentData[k]) : '';
    });
  }

  // Replace {{{var}}} — raw HTML passthrough (triple-brace)
  result = result.replace(/\{\{\{(\w+)\}\}\}/g, (m, k) => {
    if (data[k] !== undefined) return String(data[k]);
    if (parentData && parentData[k] !== undefined) return String(parentData[k]);
    return '';
  });

  // Replace {{var}} — current context, fall back to parent
  result = result.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (data[k] !== undefined) return String(data[k]);
    if (parentData && parentData[k] !== undefined) return String(parentData[k]);
    return '';
  });

  return result;
}

/**
 * Group items by category for cover page.
 */
function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const cat = item.category || '其他';
    if (!groups[cat]) {
      groups[cat] = {
        name: cat,
        color: item.color_tag || CATEGORY_COLORS[cat] || '#95A5A6',
        items: [],
      };
    }
    groups[cat].items.push(item);
  }
  return Object.values(groups);
}

/**
 * Sanitize JSON string by replacing bare Chinese quotation marks (U+201C / U+201D)
 * with corner brackets (「」) so they don't break JSON parsing.
 * This fixes a common issue when LLM-generated Chinese text uses "" inside JSON values.
 */
function sanitizeChineseQuotes(jsonStr) {
  return jsonStr.replace(/\u201c/g, '\u300c').replace(/\u201d/g, '\u300d');
}

/**
 * Estimate reading time (in minutes) from digest items.
 * Chinese reading speed ~400 chars/min; English ~200 words/min.
 */
function estimateReadingMinutes(items) {
  let totalChars = 0;
  for (const item of items) {
    // Count Chinese characters + English words across all text fields
    const texts = [item.headline_zh, item.summary_zh, item.content_html].filter(Boolean);
    for (const t of texts) {
      // Strip HTML tags for content_html
      const plain = t.replace(/<[^>]+>/g, '');
      totalChars += plain.length;
    }
  }
  // Chinese mixed text averages ~350 chars/min reading speed
  const minutes = Math.max(2, Math.ceil(totalChars / 350));
  return minutes;
}

/**
 * Estimate Claude API cost for the full pipeline (curation + enrichment).
 * Assumes Claude Opus 4 ($15/M input, $75/M output).
 * Returns a string like "2" or "1.5".
 */
function estimateApiCost(candidateCount) {
  // Typical pipeline: ~50K input tokens (scored candidates + context) + ~10K output tokens (digest)
  const inputTokens = Math.max(40000, candidateCount * 400);  // ~400 tokens per candidate
  const outputTokens = 10000;  // digest.json enriched output
  const inputCostPerM = 15;   // Opus 4 pricing
  const outputCostPerM = 75;
  const cost = (inputTokens / 1_000_000) * inputCostPerM + (outputTokens / 1_000_000) * outputCostPerM;
  // Round to nearest 0.5
  return String(Math.round(cost * 2) / 2);
}

/**
 * Render all pages from digest.json.
 */
function renderAll(digestPath, templatesDir, outputDir, sourceCount = null, numSourcesOverride = null) {
  const rawJson = readFileSync(digestPath, 'utf-8');
  const digest = JSON.parse(sanitizeChineseQuotes(rawJson));
  const items = Array.isArray(digest) ? digest : digest.items || digest.stories || [];

  if (items.length === 0) {
    console.error('[render] Error: No items in digest.json');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  // Asset base — absolute file:// URL to skills/news-card/assets (templates reference {{assetBase}}/...)
  const assetsDir = resolve(templatesDir, '..', 'assets');
  const assetBase = pathToFileURL(assetsDir).href;

  // Read templates
  const heroCoverTpl = readFileSync(join(templatesDir, 'hero-cover.html'), 'utf-8');
  const menuTpl = readFileSync(join(templatesDir, 'cover.html'), 'utf-8');
  const featureTpl = readFileSync(join(templatesDir, 'feature.html'), 'utf-8');
  const halfPageTpl = readFileSync(join(templatesDir, 'half-page.html'), 'utf-8');
  const briefsTpl = readFileSync(join(templatesDir, 'briefs.html'), 'utf-8');

  const today = new Date().toISOString().slice(0, 10);
  const issue = Math.floor(Date.now() / 86400000) % 10000;

  // Editorial date components for cover templates
  const dateObj = new Date(today);
  const dateYear = String(dateObj.getUTCFullYear());
  const dateMD = String(dateObj.getUTCMonth() + 1).padStart(2, '0') + '.' + String(dateObj.getUTCDate()).padStart(2, '0');
  const MONTHS_EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const dateMonthEn = MONTHS_EN[dateObj.getUTCMonth()];
  const dayNum = dateObj.getUTCDate();
  const ordinalSuffix = (d) => { const s = ['TH','ST','ND','RD']; const v = d % 100; return d + (s[(v - 20) % 10] || s[v] || s[0]); };
  const dateDayOrdinal = ordinalSuffix(dayNum);
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateDow = DAYS_SHORT[dateObj.getUTCDay()];

  // Split by tier
  const tier1 = items.filter((i) => i.tier === 1).slice(0, 4);
  const tier2 = items.filter((i) => i.tier === 2).slice(0, 4);
  const tier3 = items.filter((i) => i.tier === 3).slice(0, 16);

  // Ensure color_tag is set
  for (const item of [...tier1, ...tier2, ...tier3]) {
    if (!item.color_tag) {
      item.color_tag = CATEGORY_COLORS[item.category] || '#95A5A6';
    }
  }

  const pages = [];
  const allItems = [...tier1, ...tier2, ...tier3];
  const totalPages = 9; // menu + 4 feature + 2 half + 2 briefs (hero cover excluded)

  // Generate progress dots for a given page index (1-based, menu=1)
  function makeProgressDots(currentPage) {
    return Array.from({ length: totalPages }, (_, i) => ({
      active: i + 1 === currentPage,
    }));
  }

  // Reading time — hardcoded editorial choice
  const readingMinutes = 3;

  // Estimate saved values for hero cover
  // N1: hours saved — 65+ sources × ~3 min each = ~3h+ manual browsing
  const savedHours = 3;
  // N2: API cost — hardcoded editorial choice (actual session cost ~$100+)
  const savedCost = '10+';

  // Page 0: Hero Cover (brand hook — no content)
  // numSources = total fetch targets (RSS feeds + HN + HF + X accounts + newsletters + blogs)
  // Use CLI override or fall back to curated item sources as minimum
  const numSources = numSourcesOverride
    || new Set(allItems.map((i) => i.source).filter(Boolean)).size
    || 40;

  const heroHTML = renderTemplate(heroCoverTpl, {
    assetBase,
    date: today,
    date_year: dateYear,
    date_md: dateMD,
    date_dow: dateDow,
    date_month_en: dateMonthEn,
    date_day_ordinal: dateDayOrdinal,
    total: allItems.length,
    sourceCount: sourceCount || allItems.length,
    numSources,
    savedHours,
    savedCost,
    readingMinutes,
    tier1,
  });
  const heroPath = join(outputDir, 'page-0-cover.html');
  writeFileSync(heroPath, heroHTML);
  pages.push(heroPath);
  console.error(`[render] Page 0: Hero Cover`);

  // Page 1: Menu (content index — old cover.html)
  // Chinese day-of-week for menu brand-row date card
  const DAYS_ZH = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateDowZh = DAYS_ZH[dateObj.getUTCDay()];
  const dateMonth = String(dateObj.getUTCMonth() + 1);
  const dateDay = String(dateObj.getUTCDate()).padStart(2, '0');

  const menuHTML = renderTemplate(menuTpl, {
    assetBase,
    date: today,
    date_year: dateYear,
    date_md: dateMD,
    date_dow: dateDow,
    date_dow_zh: dateDowZh,
    date_month: dateMonth,
    date_day: dateDay,
    date_month_en: dateMonthEn,
    date_day_ordinal: dateDayOrdinal,
    total: allItems.length,
    sourceCount: sourceCount || allItems.length,
    numSources,
    issue,
    categories: groupByCategory(allItems),
    progress_dots: makeProgressDots(1),
  });
  const menuPath = join(outputDir, 'page-1-menu.html');
  writeFileSync(menuPath, menuHTML);
  pages.push(menuPath);
  console.error(`[render] Page 1: Menu (${allItems.length} items)`);

  // Pages 2-5: Feature (tier 1) → content page 2-5
  for (let i = 0; i < tier1.length; i++) {
    const item = tier1[i];
    const pageNum = i + 2; // content pages 2-5
    const relatedStr = (item.related_sources || [])
      .map((s) => s.source)
      .join(', ');
    const html = renderTemplate(featureTpl, {
      ...item,
      assetBase,
      content_html: item.content_html || '<p>' + (item.summary_zh || '') + '</p>',
      page_num: pageNum,
      total_pages: totalPages,
      date: today,
      issue,
      related_sources: relatedStr,
      progress_dots: makeProgressDots(pageNum),
    });
    const pagePath = join(outputDir, `page-${i + 2}-top${i + 1}.html`);
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page ${pageNum}/${totalPages}: Feature — ${item.headline_zh}`);
  }

  // Pages 6-7: Half-page (tier 2, 2 per page) → content page 6-7
  for (let i = 0; i < 2; i++) {
    const stories = tier2.slice(i * 2, i * 2 + 2);
    if (stories.length === 0) break;
    const pageNum = 6 + i;
    const html = renderTemplate(halfPageTpl, {
      assetBase,
      page_num: pageNum,
      total_pages: totalPages,
      date: today,
      issue,
      stories,
      progress_dots: makeProgressDots(pageNum),
    });
    const pagePath = join(outputDir, `page-${6 + i}-second.html`);
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page ${pageNum}/${totalPages}: Half-page (${stories.length} stories)`);
  }

  // Page 8: Briefs page 1 (first 8 tier-3 items) → content page 8
  const briefs1 = tier3.slice(0, 8);
  if (briefs1.length > 0) {
    const html = renderTemplate(briefsTpl, {
      assetBase,
      page_num: 8,
      total_pages: totalPages,
      date: today,
      issue,
      section_title: '快讯速览',
      briefs: briefs1,
      progress_dots: makeProgressDots(8),
    });
    const pagePath = join(outputDir, 'page-8-briefs.html');
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page 8/${totalPages}: Briefs (${briefs1.length} items)`);
  }

  // Page 9: Briefs page 2 (next 8 tier-3 items) → content page 9
  const briefs2 = tier3.slice(8, 16);
  if (briefs2.length > 0) {
    const html = renderTemplate(briefsTpl, {
      assetBase,
      page_num: 9,
      total_pages: totalPages,
      date: today,
      issue,
      section_title: '研究前沿',
      briefs: briefs2,
      progress_dots: makeProgressDots(9),
    });
    const pagePath = join(outputDir, 'page-9-briefs.html');
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page 9/${totalPages}: Briefs page 2 (${briefs2.length} items)`);
  }

  console.error(`[render] Generated ${pages.length} HTML files in ${outputDir}`);
  return pages;
}

// CLI entry point
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const templatesIdx = args.indexOf('--templates');
const outputIdx = args.indexOf('--output');

const sourceCountIdx = args.indexOf('--source-count');
const numSourcesIdx = args.indexOf('--num-sources');
const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution && (inputIdx === -1 || templatesIdx === -1 || outputIdx === -1)) {
  console.error('Usage: node render-html.js --input digest.json --templates ./templates --output ./html [--source-count N] [--num-sources N]');
  process.exit(1);
}

if (isDirectExecution) {
  const digestPath = resolve(args[inputIdx + 1]);
  const templatesDir = resolve(args[templatesIdx + 1]);
  const outputDir = resolve(args[outputIdx + 1]);
  const sourceCountOverride = sourceCountIdx !== -1 ? parseInt(args[sourceCountIdx + 1], 10) : null;
  const numSourcesOverride = numSourcesIdx !== -1 ? parseInt(args[numSourcesIdx + 1], 10) : null;
  renderAll(digestPath, templatesDir, outputDir, sourceCountOverride, numSourcesOverride);
}

export { renderAll, renderTemplate, CATEGORY_COLORS };
