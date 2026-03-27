# 语义 HTML 组件库

第一梯队页面中，Claude 在生成 content_html 字段时，应根据新闻内容的语义类型选择合适的 HTML 组件。所有组件使用预定义 class，样式在模板 CSS 中定义。

---

## 1. 数据高亮块（Data Highlights）

**用途**：展示关键数字、统计数据、核心指标。适用于模型性能跑分、融资金额、用户增长等。

```html
<div class="data-highlights">
  <div class="data-item">
    <span class="data-value">97.3%</span>
    <span class="data-label">MMLU 准确率</span>
  </div>
  <div class="data-item">
    <span class="data-value">2.1×</span>
    <span class="data-label">推理速度提升</span>
  </div>
  <div class="data-item">
    <span class="data-value">$6.5B</span>
    <span class="data-label">估值</span>
  </div>
</div>
```

**字数限制**：data-value 不超过 8 字符，data-label 不超过 10 个汉字。

---

## 2. 时间轴（Timeline）

**用途**：展示事件序列、发展历程、产品迭代步骤。适用于公司发展史、技术演进、政策推进时间线。

```html
<div class="timeline">
  <div class="timeline-item">
    <span class="timeline-date">2026-01</span>
    <span class="timeline-text">发布 v1.0 内测版</span>
  </div>
  <div class="timeline-item">
    <span class="timeline-date">2026-02</span>
    <span class="timeline-text">开放 API 公测</span>
  </div>
  <div class="timeline-item">
    <span class="timeline-date">2026-03</span>
    <span class="timeline-text">正式商用上线</span>
  </div>
</div>
```

**字数限制**：timeline-text 不超过 20 个汉字。

---

## 3. 引用块（Blockquote）

**用途**：展示人物发言、官方声明、专家观点。适用于 CEO 发言、研究者评论、政策声明。

```html
<blockquote class="quote-block">
  <p class="quote-text">"我们相信 AI 将在未来三年内彻底改变软件开发的方式。"</p>
  <cite class="quote-source">— Sam Altman, OpenAI CEO</cite>
</blockquote>
```

**字数限制**：quote-text 不超过 60 个汉字。

---

## 4. 对比卡片（Comparison Grid）

**用途**：展示正反对比、前后对比、方案比较。适用于模型对比、新旧版本差异、竞品分析。

```html
<div class="comparison-grid">
  <div class="comparison-col">
    <div class="comparison-header positive">优势</div>
    <ul class="comparison-list">
      <li>推理速度提升 2 倍</li>
      <li>支持 128K 上下文</li>
      <li>多模态原生支持</li>
    </ul>
  </div>
  <div class="comparison-col">
    <div class="comparison-header negative">局限</div>
    <ul class="comparison-list">
      <li>中文能力仍有差距</li>
      <li>API 价格上涨 30%</li>
      <li>暂不支持微调</li>
    </ul>
  </div>
</div>
```

**字数限制**：每条 li 不超过 15 个汉字，每列不超过 4 条。

---

## 5. 要点列表（Key Points）

**用途**：总结核心要点、文章精华。适用于任何需要提炼要点的新闻。

```html
<ul class="key-points">
  <li>首次在数学推理任务上超越人类专家水平</li>
  <li>训练成本降低至前代模型的 1/3</li>
  <li>开源权重将于下月发布</li>
</ul>
```

**字数限制**：每条 li 不超过 25 个汉字，总条数 3-5 条。

---

## 6. 高亮框（Highlight）

**用途**：突出一句话核心洞察或关键结论。适用于编辑点评、核心判断。

```html
<div class="highlight-box">
  <p>这标志着开源模型首次在综合能力上追平闭源前沿。</p>
</div>
```

**字数限制**：不超过 25 个汉字。

---

## 7. Callout 提示框（Callout）

**用途**：提供背景知识、术语解释、补充说明。适用于技术名词解释、政策背景介绍。

```html
<div class="callout">
  <span class="callout-label">背景</span>
  <p>MMLU（Massive Multitask Language Understanding）是衡量大语言模型知识广度的标准基准，涵盖 57 个学科领域。</p>
</div>
```

**字数限制**：callout 正文不超过 60 个汉字。

---

## 8. 分割线（Divider）

**用途**：在内容区块之间添加视觉分隔。适用于不同主题段落之间的过渡。

```html
<hr class="section-divider">
```

无字数限制。
