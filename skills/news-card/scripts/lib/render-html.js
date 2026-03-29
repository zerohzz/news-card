#!/usr/bin/env node

/**
 * Render digest.json into HTML files using templates.
 * Usage: node render-html.js --input digest.json --templates ./templates --output ./html
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Category → color mapping (from design-tokens.md)
const CATEGORY_COLORS = {
  '模型发布': '#4A90D9',
  '产品应用': '#7B68EE',
  '安全对齐': '#E74C3C',
  '行业动态': '#F39C12',
  '开发工具': '#2ECC71',
  '研究前沿': '#1ABC9C',
  '开源生态': '#E67E22',
  '政策监管': '#95A5A6',
  '劳动力影响': '#8E44AD',
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
 * Render all pages from digest.json.
 */
function renderAll(digestPath, templatesDir, outputDir, sourceCount = null) {
  const digest = JSON.parse(readFileSync(digestPath, 'utf-8'));
  const items = Array.isArray(digest) ? digest : digest.items || digest.stories || [];

  if (items.length === 0) {
    console.error('[render] Error: No items in digest.json');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  // Read templates
  const heroCoverTpl = readFileSync(join(templatesDir, 'hero-cover.html'), 'utf-8');
  const menuTpl = readFileSync(join(templatesDir, 'cover.html'), 'utf-8');
  const featureTpl = readFileSync(join(templatesDir, 'feature.html'), 'utf-8');
  const halfPageTpl = readFileSync(join(templatesDir, 'half-page.html'), 'utf-8');
  const briefsTpl = readFileSync(join(templatesDir, 'briefs.html'), 'utf-8');

  const today = new Date().toISOString().slice(0, 10);
  const issue = Math.floor(Date.now() / 86400000) % 10000;

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
  const totalPages = 10; // hero + menu + 4 feature + 2 half + 2 briefs

  // Generate progress dots for a given page index (0-based, hero=0 has no dots)
  function makeProgressDots(currentPage) {
    return Array.from({ length: totalPages }, (_, i) => ({
      active: i === currentPage,
    }));
  }

  // Estimate saved values for hero cover
  // N1: hours saved — 40+ sources × ~3 min each = ~2h browsing, plus social media ~1h
  const savedHours = 3;
  // N2: API cost — ~130 candidates × scoring + newsletter signals ≈ $0.15/day compute
  const savedCost = '0.15';

  // Page 0: Hero Cover (brand hook — no content)
  const heroHTML = renderTemplate(heroCoverTpl, {
    date: today,
    total: allItems.length,
    sourceCount: sourceCount || allItems.length,
    savedHours,
    savedCost,
  });
  const heroPath = join(outputDir, 'page-0-cover.html');
  writeFileSync(heroPath, heroHTML);
  pages.push(heroPath);
  console.error(`[render] Page 0: Hero Cover`);

  // Page 1: Menu (content index — old cover.html)
  const menuHTML = renderTemplate(menuTpl, {
    date: today,
    total: allItems.length,
    sourceCount: sourceCount || allItems.length,
    issue,
    categories: groupByCategory(allItems),
    progress_dots: makeProgressDots(1),
  });
  const menuPath = join(outputDir, 'page-1-menu.html');
  writeFileSync(menuPath, menuHTML);
  pages.push(menuPath);
  console.error(`[render] Page 1: Menu (${allItems.length} items)`);

  // Pages 2-5: Feature (tier 1)
  for (let i = 0; i < tier1.length; i++) {
    const item = tier1[i];
    const relatedStr = (item.related_sources || [])
      .map((s) => s.source)
      .join(', ');
    const html = renderTemplate(featureTpl, {
      ...item,
      content_html: item.content_html || '<p>' + (item.summary_zh || '') + '</p>',
      page_num: i + 2,
      date: today,
      issue,
      related_sources: relatedStr,
      progress_dots: makeProgressDots(i + 2),
    });
    const pagePath = join(outputDir, `page-${i + 2}-top${i + 1}.html`);
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page ${i + 2}: Feature — ${item.headline_zh}`);
  }

  // Pages 6-7: Half-page (tier 2, 2 per page)
  for (let i = 0; i < 2; i++) {
    const stories = tier2.slice(i * 2, i * 2 + 2);
    if (stories.length === 0) break;
    const html = renderTemplate(halfPageTpl, {
      page_num: 6 + i,
      date: today,
      issue,
      stories,
      progress_dots: makeProgressDots(6 + i),
    });
    const pagePath = join(outputDir, `page-${6 + i}-second.html`);
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page ${6 + i}: Half-page (${stories.length} stories)`);
  }

  // Page 8: Briefs page 1 (first 8 tier-3 items)
  const briefs1 = tier3.slice(0, 8);
  if (briefs1.length > 0) {
    const html = renderTemplate(briefsTpl, {
      page_num: 8,
      date: today,
      issue,
      briefs: briefs1,
      progress_dots: makeProgressDots(8),
    });
    const pagePath = join(outputDir, 'page-8-briefs.html');
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page 8: Briefs (${briefs1.length} items)`);
  }

  // Page 9: Briefs page 2 (next 8 tier-3 items)
  const briefs2 = tier3.slice(8, 16);
  if (briefs2.length > 0) {
    const html = renderTemplate(briefsTpl, {
      page_num: 9,
      date: today,
      issue,
      briefs: briefs2,
      progress_dots: makeProgressDots(9),
    });
    const pagePath = join(outputDir, 'page-9-briefs.html');
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page 9: Briefs page 2 (${briefs2.length} items)`);
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

if (inputIdx === -1 || templatesIdx === -1 || outputIdx === -1) {
  console.error('Usage: node render-html.js --input digest.json --templates ./templates --output ./html [--source-count N]');
  process.exit(1);
}

const digestPath = resolve(args[inputIdx + 1]);
const templatesDir = resolve(args[templatesIdx + 1]);
const outputDir = resolve(args[outputIdx + 1]);
const sourceCountOverride = sourceCountIdx !== -1 ? parseInt(args[sourceCountIdx + 1], 10) : null;

renderAll(digestPath, templatesDir, outputDir, sourceCountOverride);

export { renderAll, renderTemplate, CATEGORY_COLORS };
