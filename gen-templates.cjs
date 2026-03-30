#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const logoDataUri = fs.readFileSync('logo_b64.txt', 'utf-8').trim();
const fontPath = 'file:///' + path.resolve('skills/news-card/assets/fonts/ChillDuanHeiSongPro_Regular.otf').replace(/\\/g, '/');
const notoBlackPath = 'file:///' + path.resolve('skills/news-card/assets/fonts/NotoSerifSC-Black.ttf').replace(/\\/g, '/');

// ────────────────────────────────────────────────────────────────────────────
// hero-cover.html
// ────────────────────────────────────────────────────────────────────────────
const heroHtml = `<!DOCTYPE html>
<!-- Hero cover — 1080×1920 (same as all pages)                              -->
<!-- Visible content zone: center 3:4 = 1080×1440, padding 240px top+bottom -->
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500;600;700;900&family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;0,900;1,400&display=swap" rel="stylesheet">
<style>
  @font-face {
    font-family: 'ChillDuanHei';
    src: url('${fontPath}') format('opentype');
    font-weight: normal;
    font-style: normal;
  }
  /* Noto Serif SC Black (900) — same font used in zz-ai-daily-logo */
  @font-face {
    font-family: 'NotoSerifSCBlack';
    src: url('${notoBlackPath}') format('truetype');
    font-weight: 900;
    font-style: normal;
  }

  :root {
    --bg: #FFF9F5;
    --ink: #1C1917;
    --text: #1A1A1A;
    --text-mid: #6B7280;
    --text-dim: #9CA3AF;
    --accent: #E8734A;
    --gold: #B8852A;
    --gold-light: #D4A855;
    --green: #059669;
    --red: #DC2626;
    --rule: rgba(28,25,23,0.13);
    --font-chill: 'ChillDuanHei', 'Noto Serif SC', serif;
    --font-zh: 'Noto Serif SC', 'Source Han Serif SC', serif;
    --font-en: 'Source Serif Pro', Georgia, serif;
    /* 3:4 safe zone = 240px each side, add 40px extra top buffer for XHS crop */
    --safe-top: 280px;
    --safe-bot: 240px;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    width: 1080px;
    height: 1920px;
    margin: 0; padding: 0; overflow: hidden;
    background: var(--bg);
    font-family: var(--font-zh);
    color: var(--text);
  }

  .page {
    position: relative;
    width: 1080px;
    height: 1920px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--safe-top) 60px var(--safe-bot);
  }

  .page::after {
    content: '';
    position: absolute; inset: 0;
    filter: url(#grain);
    opacity: 0.03;
    pointer-events: none;
    z-index: 100;
  }

  /* ─── Date line — "2026.03.30 Mon" ─── */
  .date-line {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 0;
    margin-bottom: 18px;
  }

  .date-line .dl-main {
    font-family: var(--font-en);
    font-size: 40px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 1px;
  }

  .date-line .dl-dow {
    font-family: var(--font-en);
    font-size: 32px;
    font-weight: 400;
    color: var(--text-mid);
    margin-left: 14px;
    letter-spacing: 1px;
  }

  /* ─── Brand mark — mirrors zz-ai-daily-logo/src/App.tsx ─── */
  .brand-mark {
    flex-shrink: 0;
    position: relative;
    width: 340px;
    height: 340px;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  /* SVG arcs positioned absolute, fills the container */
  .brand-mark svg.arcs {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* Noto Serif SC 900 — exact match to zz-ai-daily-logo App.tsx */
  .brand-zz {
    position: relative;
    z-index: 4;
    font-family: 'NotoSerifSCBlack', 'Noto Serif SC', serif;
    font-size: 68px;
    font-weight: 900;
    color: #c5a059;
    line-height: 1;
    letter-spacing: -1px;
    margin-bottom: 2px;
  }

  .brand-name-wrap {
    position: relative;
    z-index: 3;
    background: var(--bg);
    padding: 8px 24px;
  }

  .brand-name {
    font-family: 'NotoSerifSCBlack', 'Noto Serif SC', serif;
    font-size: 46px;
    font-weight: 900;
    color: var(--ink);
    line-height: 1;
    letter-spacing: -0.5px;
    white-space: nowrap;
  }

  /* ─── Slogan (above rule) ─── */
  .slogan-above-rule {
    flex-shrink: 0;
    text-align: center;
    padding: 22px 0 26px;
  }

  .slogan-above-rule .slogan {
    font-size: 32px;
    font-weight: 400;
    color: var(--text-mid);
    line-height: 2.0;
  }

  .slogan-above-rule .slogan .green { color: var(--green); font-weight: 700; }
  .slogan-above-rule .slogan .red   { color: var(--red);   font-weight: 700; }

  /* ─── Top 4 news — headlines are the star ─── */
  .top4-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    flex: 1;
  }

  .top4-item {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    padding: 20px 0;
    border-bottom: 1px solid var(--rule);
  }

  .top4-item:first-child { border-top: none; }

  .top4-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
    padding-top: 3px;
  }

  .top4-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-en);
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }

  .top4-cat {
    font-family: var(--font-zh);
    font-size: 15px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    color: #fff;
    white-space: nowrap;
  }

  .top4-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .top4-headline {
    font-family: var(--font-zh);
    font-size: 34px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.4;
  }

  .top4-source {
    font-family: var(--font-en);
    font-size: 18px;
    color: var(--text-dim);
    letter-spacing: 0.5px;
  }

  /* ─── Ruled separator ─── */
  .rule-pair {
    width: 100%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 20px 0 0;
  }
  .rule-pair .r1 { height: 2px; background: var(--ink); opacity: 0.80; }
  .rule-pair .r2 { height: 1px; background: var(--rule); }

  /* ─── Content section ─── */
  .content-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 24px;
    width: 100%;
    gap: 20px;
  }

  /* ─── Stats — secondary info, compact ─── */
  .stats-row {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 0;
    padding: 18px 0;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
  }

  .stat-item {
    flex: 1;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 8px;
    padding: 0 8px;
  }

  .stat-item + .stat-item {
    border-left: 1px solid rgba(28,25,23,0.12);
  }

  .stat-num {
    font-family: var(--font-en);
    font-size: 60px;
    font-weight: 900;
    color: var(--ink);
    line-height: 1;
    letter-spacing: -2px;
  }

  .stat-num sup {
    font-size: 24px;
    font-weight: 600;
    vertical-align: super;
    letter-spacing: 0;
  }

  .stat-label {
    font-family: var(--font-zh);
    font-size: 22px;
    font-weight: 400;
    color: var(--text-mid);
    letter-spacing: 0.5px;
  }

  /* ─── Pain points ─── */
  .pain-section {
    text-align: center;
  }

  .pain-points {
    display: flex;
    justify-content: center;
    gap: 44px;
  }

  .pain-points span {
    font-size: 34px;
    color: rgba(28, 25, 23, 0.42);
    text-decoration: line-through;
    text-decoration-color: var(--accent);
    text-decoration-thickness: 3px;
    font-weight: 600;
    letter-spacing: 2px;
  }

  /* ─── Slogan ─── */
  .slogan-wrap {
    text-align: center;
  }

  .slogan {
    font-size: 34px;
    font-weight: 400;
    color: var(--text-mid);
    line-height: 2.05;
    max-width: 860px;
  }

  .slogan .green { color: var(--green); font-weight: 700; }
  .slogan .red   { color: var(--red);   font-weight: 700; }

  /* ─── AI badge — hollow outline, Apple squircle radius ─── */
  /* Apple continuous-corner standard: radius ≈ 22.5% of element height     */
  /* Badge height ~30px → radius = 30 × 0.225 ≈ 7px                        */
  .ai-label {
    position: absolute;
    right: 52px;
    /* sits just inside the bottom safe-zone edge */
    bottom: calc(var(--safe-bot) - 56px);
    border: 1.5px solid var(--accent);
    border-radius: 7px;
    padding: 6px 16px;
    font-family: var(--font-zh);
    font-size: 16px;
    font-weight: 400;
    color: var(--accent);
    background: transparent;
    letter-spacing: 1px;
    line-height: 1;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Date line — "2026.03.30 Mon" -->
  <div class="date-line">
    <span class="dl-main">{{date_year}}.{{date_md}}</span>
    <span class="dl-dow">{{date_dow}}</span>
  </div>

  <!-- Brand mark — mirrors zz-ai-daily-logo App.tsx design -->
  <!-- Container: 280×280 scaled from original 600×600 viewBox -->
  <div class="brand-mark">

    <!-- Double concentric gold arcs (top + bottom half-circles) -->
    <svg class="arcs" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- Top half — outer + inner arc -->
      <g filter="url(#gold-glow)" opacity="0.9">
        <path d="M 100,300 A 200,200 0 0,1 500,300" fill="none" stroke="#c5a059" stroke-width="2.5"/>
        <path d="M 118,300 A 182,182 0 0,1 482,300" fill="none" stroke="#c5a059" stroke-width="2.5" opacity="0.7"/>
      </g>
      <!-- Bottom half — outer + inner arc -->
      <g filter="url(#gold-glow)" opacity="0.9">
        <path d="M 100,300 A 200,200 0 0,0 500,300" fill="none" stroke="#c5a059" stroke-width="2.5"/>
        <path d="M 118,300 A 182,182 0 0,0 482,300" fill="none" stroke="#c5a059" stroke-width="2.5" opacity="0.7"/>
      </g>
    </svg>

    <!-- zz (gold, lowercase, top of circle) -->
    <span class="brand-zz">zz</span>

    <!-- AI资讯日报 with bg bar that cuts through the arcs -->
    <div class="brand-name-wrap">
      <span class="brand-name">AI资讯日报</span>
    </div>

  </div>

  <!-- Slogan — above rule, two lines so highlights breathe -->
  <div class="slogan-above-rule">
    <div class="slogan">
      每天阅读<span class="green">3&thinsp;分钟</span><br>
      节约 <span class="red">{{savedHours}}&thinsp;小时</span> 无效刷新 · <span class="red">$\{{savedCost}}</span> 聚合费用
    </div>
  </div>

  <div class="rule-pair"><div class="r1"></div><div class="r2"></div></div>

  <!-- Body content -->
  <div class="content-section">
    <div class="content-group">

      <!-- Stats — compact credibility bar -->
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-num">{{total}}</div>
          <div class="stat-label">精选</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{sourceCount}}<sup>+</sup></div>
          <div class="stat-label">条候选</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{numSources}}<sup>+</sup></div>
          <div class="stat-label">个来源</div>
        </div>
      </div>

      <!-- Top 4 news — headlines are the star -->
      <div class="top4-list">
        {{#each tier1}}
        <div class="top4-item">
          <div class="top4-left">
            <div class="top4-badge" style="background: {{color_tag}}">{{tier}}</div>
            <div class="top4-cat" style="background: {{color_tag}}">{{category}}</div>
          </div>
          <div class="top4-right">
            <div class="top4-headline">{{headline_zh}}</div>
            <div class="top4-source">{{source}}</div>
          </div>
        </div>
        {{/each}}
      </div>

    </div>
  </div>

  <div class="ai-label">含AI辅助生成内容</div>

</div>
<svg width="0" height="0" style="position:absolute">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
</svg>
</body>
</html>`;

fs.writeFileSync('skills/news-card/templates/hero-cover.html', heroHtml);
console.log('Written hero-cover.html, length:', heroHtml.length);

// ────────────────────────────────────────────────────────────────────────────
// Patch cover.html — inject logo + editorial date header + footer logo text
// ────────────────────────────────────────────────────────────────────────────
// Always read from the clean source to avoid double-patching on re-runs
let coverHtml = fs.readFileSync('skills/news-card/templates/cover-source.html', 'utf-8').replace(/\r\n/g, '\n');

// 1. Add logo-img CSS before the closing </style>
const logoImgCss = `
  .logo-header-img {
    width: 200px;
    height: auto;
    mix-blend-mode: multiply;
    display: block;
    margin: 0 auto 4px;
  }

  .header-date-editorial {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0;
    margin-bottom: 6px;
  }

  .header-date-year {
    font-family: var(--font-en);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-mid);
    letter-spacing: 1px;
  }

  .header-date-sep {
    font-family: var(--font-en);
    font-size: 18px;
    font-weight: 300;
    color: var(--accent);
    margin: 0 3px;
  }

  .header-date-md {
    font-family: var(--font-en);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-mid);
    letter-spacing: 1px;
  }

  .header-date-suffix {
    font-family: var(--font-en);
    font-size: 13px;
    font-weight: 400;
    color: var(--text-dim);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-left: 8px;
  }
`;

coverHtml = coverHtml.replace('</style>', logoImgCss + '</style>');

// 2. Replace the date + h1 + subtitle header block
const oldHeader = `  <div class="header">
    <div class="date">{{date}}</div>
    <h1 style="font-size: 60px; letter-spacing: 4px;"><span style="color: var(--accent);">zz</span> AI 资讯日报</h1>
    <div class="subtitle">今日 AI 领域新闻和资讯</div>
  </div>`;

const newHeader = `  <div class="header">
    <img class="logo-header-img" src="${logoDataUri}" alt="ZZ AI资讯日报">
    <div class="header-date-editorial">
      <span class="header-date-year">{{date_year}}</span>
      <span class="header-date-sep">—</span>
      <span class="header-date-md">{{date_md}}</span>
      <span class="header-date-suffix">{{date_month_en}} · {{date_day_ordinal}}</span>
    </div>
  </div>`;

coverHtml = coverHtml.replace(oldHeader, newHeader);

// 3. Replace footer brand text
coverHtml = coverHtml.replace(
  '<span class="brand">zz AI 资讯日报</span>',
  '<span class="brand">ZZ AI 资讯日报</span>'
);

fs.writeFileSync('skills/news-card/templates/cover.html', coverHtml);
console.log('Written cover.html, length:', coverHtml.length);
