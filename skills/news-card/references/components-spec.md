# 语义 HTML 组件库

第一梯队页面中，Claude 在生成 content_html 字段时，应根据新闻内容的语义类型选择合适的 HTML 组件。所有组件使用预定义 class，样式在模板 CSS 中定义。

共 28 个组件，分 7 个语义类别。

---

## Category 1: 步骤/工具/流程

### 1. timeline — 时间轴

**用途**：展示事件序列、发展历程、产品迭代步骤。

```html
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-marker">1</div>
    <div class="timeline-content">
      <strong>2026-01 发布内测版</strong>
      <p>面向开发者开放 API 访问</p>
    </div>
  </div>
  <div class="timeline-item">
    <div class="timeline-marker">2</div>
    <div class="timeline-content">
      <strong>2026-03 正式商用</strong>
      <p>全球同步上线</p>
    </div>
  </div>
</div>
```

**限制**：timeline-content strong 不超过 20 字，p 不超过 30 字。

---

### 2. flowchart — 流程图

**用途**：展示水平/线性步骤流程，箭头连接。

```html
<div class="flowchart">
  <div class="flowchart-step">数据采集</div>
  <div class="flowchart-arrow">→</div>
  <div class="flowchart-step">清洗标注</div>
  <div class="flowchart-arrow">→</div>
  <div class="flowchart-step">模型训练</div>
  <div class="flowchart-arrow">→</div>
  <div class="flowchart-step">部署上线</div>
</div>
```

**限制**：每步不超过 6 字，3-6 步为宜。

---

### 3. funnel — 漏斗图

**用途**：展示逐步缩减的漏斗流程（用户转化、筛选过程）。宽度通过 inline style 设置。

```html
<div class="funnel">
  <div class="funnel-level" style="width:100%">10,000 访问者</div>
  <div class="funnel-level" style="width:75%">3,200 注册</div>
  <div class="funnel-level" style="width:45%">800 付费用户</div>
  <div class="funnel-level" style="width:20%">120 企业客户</div>
</div>
```

**限制**：3-5 层，每层不超过 15 字。

---

### 4. gantt — 甘特图

**用途**：展示多个阶段/任务的时间跨度和重叠情况。

```html
<div class="gantt">
  <div class="gantt-row">
    <div class="gantt-label">研发阶段</div>
    <div class="gantt-bar-track">
      <div class="gantt-bar" style="left:0%;width:40%">Q1-Q2</div>
    </div>
  </div>
  <div class="gantt-row">
    <div class="gantt-label">内测阶段</div>
    <div class="gantt-bar-track">
      <div class="gantt-bar" style="left:30%;width:30%">Q2-Q3</div>
    </div>
  </div>
  <div class="gantt-row">
    <div class="gantt-label">正式上线</div>
    <div class="gantt-bar-track">
      <div class="gantt-bar" style="left:55%;width:45%">Q3-Q4</div>
    </div>
  </div>
</div>
```

**限制**：gantt-label 不超过 8 字，gantt-bar 文字不超过 6 字，3-6 行为宜。

---

## Category 2: 对比/选择/优劣

### 5. compare-grid — VS 对比卡

**用途**：展示正反对比、方案比较。

```html
<div class="compare-grid">
  <div class="compare-item compare-pro">
    <strong>优势</strong>
    <p>推理速度提升 2 倍</p>
  </div>
  <div class="compare-item compare-con">
    <strong>局限</strong>
    <p>中文能力仍有差距</p>
  </div>
</div>
```

**限制**：每格 strong 不超过 4 字，p 不超过 20 字。

---

### 6. decision-tree — 决策树

**用途**：展示分支决策路径（是/否、选项 A/B）。

```html
<div class="decision-tree">
  <div class="dt-node">是否需要实时推理？</div>
  <div class="dt-branches">
    <div class="dt-branch">
      <div class="dt-branch-label">是 →</div>
      <p>选择边缘部署方案，延迟 &lt;10ms</p>
    </div>
    <div class="dt-branch">
      <div class="dt-branch-label">否 →</div>
      <p>选择云端批处理，成本降低 60%</p>
    </div>
  </div>
</div>
```

**限制**：dt-node 不超过 15 字，分支 2-3 个，每个分支描述不超过 25 字。

---

### 7. compare-table — 对比表格

**用途**：多维度结构化对比（产品、技术参数、竞品对比）。

```html
<table class="compare-table">
  <tr><th>维度</th><th>方案 A</th><th>方案 B</th></tr>
  <tr><td>性能</td><td>97.3%</td><td>94.1%</td></tr>
  <tr><td>价格</td><td>$20/月</td><td>$8/月</td></tr>
  <tr><td>延迟</td><td>120ms</td><td>45ms</td></tr>
</table>
```

**限制**：2-4 列，3-6 行，每格不超过 10 字。

---

### 8. pros-cons — 优劣势色块

**用途**：绿色/红色并列展示优劣势列表。

```html
<div class="pros-cons">
  <div class="pros-block">
    <strong>优势</strong>
    <ul>
      <li>开源免费</li>
      <li>社区活跃</li>
      <li>文档完善</li>
    </ul>
  </div>
  <div class="cons-block">
    <strong>劣势</strong>
    <ul>
      <li>学习曲线陡峭</li>
      <li>生态碎片化</li>
      <li>企业支持有限</li>
    </ul>
  </div>
</div>
```

**限制**：每侧 2-5 条，每条不超过 12 字。

---

## Category 3: 数字/结论/数据

### 9. data-row + data-highlight — 数据高亮块

**用途**：展示关键数字、统计数据、核心指标。

```html
<div class="data-row">
  <div class="data-highlight">
    <span class="data-value">97.3%</span>
    <span class="data-label">MMLU 准确率</span>
  </div>
  <div class="data-highlight">
    <span class="data-value">2.1x</span>
    <span class="data-label">推理速度提升</span>
  </div>
</div>
```

**限制**：data-value 不超过 8 字符，data-label 不超过 10 字。2-4 个为宜。

---

### 10. progress-group — 进度条

**用途**：展示多项指标的完成度/百分比对比。

```html
<div class="progress-group">
  <div class="progress-item">
    <div class="progress-label"><span>代码生成</span><span>92%</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:92%"></div></div>
  </div>
  <div class="progress-item">
    <div class="progress-label"><span>数学推理</span><span>78%</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:78%"></div></div>
  </div>
  <div class="progress-item">
    <div class="progress-label"><span>多语言理解</span><span>85%</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:85%"></div></div>
  </div>
</div>
```

**限制**：标签不超过 8 字，3-6 条为宜。

---

### 11. pie-chart — 饼图/环形图

**用途**：展示占比分布（市场份额、资源分配）。使用 conic-gradient 纯 CSS 实现。

```html
<div class="pie-chart-container">
  <div class="pie-chart" style="background: conic-gradient(#4A90D9 0% 40%, #E74C3C 40% 70%, #2ECC71 70% 100%)"></div>
  <ul class="pie-legend">
    <li><span class="pie-legend-dot" style="background:#4A90D9"></span>OpenAI 40%</li>
    <li><span class="pie-legend-dot" style="background:#E74C3C"></span>Google 30%</li>
    <li><span class="pie-legend-dot" style="background:#2ECC71"></span>其他 30%</li>
  </ul>
</div>
```

环形图变体：将 `pie-chart` 换为 `pie-chart-donut`（中心镂空）。

**限制**：2-5 个扇区，图例文字不超过 12 字。

---

### 12. bubble-chart — 气泡图

**用途**：展示多个项目的相对大小/重要性。

```html
<div class="bubble-chart">
  <div class="bubble" style="width:140px;height:140px">
    $6.5B
    <span class="bubble-label">估值</span>
  </div>
  <div class="bubble" style="width:100px;height:100px">
    2.1M
    <span class="bubble-label">用户数</span>
  </div>
  <div class="bubble" style="width:80px;height:80px">
    350
    <span class="bubble-label">员工</span>
  </div>
</div>
```

**限制**：3-6 个气泡，主值不超过 6 字符，标签不超过 6 字。

---

## Category 4: 定义/概念/理论

### 13. concept-map — 概念图

**用途**：展示核心概念及其关联子概念（放射状布局）。

```html
<div class="concept-map">
  <div class="concept-center">大语言模型</div>
  <div class="concept-branches">
    <div class="concept-branch">预训练</div>
    <div class="concept-branch">微调</div>
    <div class="concept-branch">RLHF</div>
    <div class="concept-branch">推理优化</div>
    <div class="concept-branch">多模态</div>
  </div>
</div>
```

**限制**：中心概念不超过 6 字，分支 3-8 个，每个不超过 8 字。

---

### 14. formula-box — 公式框

**用途**：展示公式、算法伪代码、关键表达式。

```html
<div class="formula-box">
  Score = cross_val × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8
</div>
```

**限制**：公式不超过 80 字符，可多行。

---

### 15. definition-list — 名词解释卡片

**用途**：展示术语定义、概念解释、词汇表。

```html
<div class="definition-list">
  <div class="definition-item">
    <div class="definition-term">RLHF</div>
    <div class="definition-desc">基于人类反馈的强化学习，通过人类偏好数据对齐模型输出。</div>
  </div>
  <div class="definition-item">
    <div class="definition-term">CoT</div>
    <div class="definition-desc">思维链推理，让模型逐步展示推理过程以提高准确性。</div>
  </div>
</div>
```

**限制**：术语不超过 10 字，解释不超过 40 字，2-5 条为宜。

---

### 16. callout — Callout 提示框

**用途**：提供背景知识、术语解释、补充说明。

```html
<div class="callout">
  <strong>背景</strong>
  <p>MMLU 是衡量大语言模型知识广度的标准基准，涵盖 57 个学科领域。</p>
</div>
```

**限制**：正文不超过 60 字。

---

## Category 5: 多要素关联

### 17. venn — 维恩图

**用途**：展示两个概念的重叠与差异。纯 CSS 绝对定位实现。

```html
<div class="venn">
  <div class="venn-circle venn-left"></div>
  <div class="venn-circle venn-right"></div>
  <div class="venn-label-left">开源模型</div>
  <div class="venn-label-right">闭源模型</div>
  <div class="venn-center">API 服务</div>
</div>
```

**限制**：左右标签各不超过 6 字，中心文字不超过 8 字。

---

### 18. quadrant — 四象限矩阵

**用途**：展示 2x2 矩阵分类（重要-紧急、成本-效果等）。

```html
<div class="quadrant">
  <div class="quadrant-cell">
    <strong>高影响 / 低成本</strong>
    <p>优先推进的项目</p>
  </div>
  <div class="quadrant-cell">
    <strong>高影响 / 高成本</strong>
    <p>需要资源评估</p>
  </div>
  <div class="quadrant-cell">
    <strong>低影响 / 低成本</strong>
    <p>有余力再做</p>
  </div>
  <div class="quadrant-cell">
    <strong>低影响 / 高成本</strong>
    <p>建议放弃</p>
  </div>
</div>
```

**限制**：每格 strong 不超过 10 字，p 不超过 15 字。

---

### 19. cycle — 循环图

**用途**：展示循环流程（PDCA、反馈闭环）。

```html
<div class="cycle">
  <div class="cycle-step">计划</div>
  <div class="cycle-arrow">→</div>
  <div class="cycle-step">执行</div>
  <div class="cycle-arrow">→</div>
  <div class="cycle-step">检查</div>
  <div class="cycle-arrow">→</div>
  <div class="cycle-step">改进</div>
  <div class="cycle-arrow">↩</div>
</div>
```

**限制**：3-6 步，每步不超过 6 字。末尾箭头用 ↩ 表示回到起点。

---

### 20. fishbone — 鱼骨图

**用途**：展示因果分析（原因-结果关系）。

```html
<div class="fishbone">
  <div class="fishbone-head">效果：模型推理延迟过高</div>
  <div class="fishbone-spine"></div>
  <div class="fishbone-causes">
    <div class="fishbone-cause">
      <strong>硬件</strong>
      <p>GPU 显存不足，频繁换页</p>
    </div>
    <div class="fishbone-cause">
      <strong>算法</strong>
      <p>注意力计算复杂度 O(n²)</p>
    </div>
    <div class="fishbone-cause">
      <strong>部署</strong>
      <p>未启用量化和批处理</p>
    </div>
  </div>
</div>
```

**限制**：3-6 个原因，每个标题不超过 4 字，描述不超过 15 字。

---

## Category 6: 要点/关键词/总结

### 21. tag-cloud — 标签云

**用途**：展示关键词、热门话题、技术栈。用 tag-lg/md/sm 控制大小。

```html
<div class="tag-cloud">
  <span class="tag-cloud-item tag-lg">大语言模型</span>
  <span class="tag-cloud-item tag-md">多模态</span>
  <span class="tag-cloud-item tag-sm">知识蒸馏</span>
  <span class="tag-cloud-item tag-lg">AI Agent</span>
  <span class="tag-cloud-item tag-sm">RLHF</span>
  <span class="tag-cloud-item tag-md">开源生态</span>
</div>
```

**限制**：6-15 个标签，每个不超过 8 字。

---

### 22. numbered-grid — 编号卡片网格

**用途**：展示有序要点的网格排列（2 列布局）。

```html
<div class="numbered-grid">
  <div class="numbered-item">
    <div class="num">1</div>
    <div class="num-text">模型参数规模突破万亿</div>
  </div>
  <div class="numbered-item">
    <div class="num">2</div>
    <div class="num-text">训练成本降低至 1/3</div>
  </div>
  <div class="numbered-item">
    <div class="num">3</div>
    <div class="num-text">推理速度提升 2 倍</div>
  </div>
  <div class="numbered-item">
    <div class="num">4</div>
    <div class="num-text">首次支持多模态输入</div>
  </div>
</div>
```

**限制**：4-8 项，每项文字不超过 15 字。

---

### 23. checklist — Checklist

**用途**：展示已完成/待办事项、功能清单。

```html
<ul class="checklist">
  <li>支持中文和英文</li>
  <li>多模态图片理解</li>
  <li class="unchecked">视频理解（即将推出）</li>
  <li class="unchecked">实时语音对话</li>
</ul>
```

**限制**：3-8 项，每项不超过 15 字。unchecked 类为未完成项。

---

### 24. badge-list — 标签徽章

**用途**：展示标签、分类、技术栈等内联徽章。

```html
<div class="badge-list">
  <span class="badge">PyTorch</span>
  <span class="badge">Transformer</span>
  <span class="badge-outline">开源</span>
  <span class="badge-outline">MIT License</span>
</div>
```

**限制**：3-10 个徽章，每个不超过 10 字。badge 为实心，badge-outline 为描边。

---

## Category 7: 观点/金句/引用

### 25. blockquote — Quote 引用块

**用途**：展示人物发言、官方声明、专家观点。

```html
<blockquote>
  <p>"我们相信 AI 将在未来三年内彻底改变软件开发的方式。"</p>
  <cite>— Sam Altman, OpenAI CEO</cite>
</blockquote>
```

**限制**：引文不超过 60 字。

---

### 26. chat-bubble — 对话气泡

**用途**：展示对话场景、多人观点、问答形式。

```html
<div class="chat-bubble">
  <div class="chat-avatar">S</div>
  <div class="chat-body">
    <div class="chat-name">Sam Altman</div>
    <p class="chat-text">AGI 比大多数人想象的更近。</p>
  </div>
</div>
<div class="chat-bubble">
  <div class="chat-avatar">D</div>
  <div class="chat-body">
    <div class="chat-name">Demis Hassabis</div>
    <p class="chat-text">我们需要先解决价值对齐问题。</p>
  </div>
</div>
```

**限制**：chat-avatar 用首字母，chat-text 不超过 40 字，2-4 条对话为宜。

---

### 27. highlight — 高亮色块

**用途**：突出一句话核心洞察或关键结论。

```html
<div class="highlight">这标志着开源模型首次在综合能力上追平闭源前沿。</div>
```

**限制**：不超过 25 字。

---

### 28. person-card — 人物卡片

**用途**：展示人物简介及其核心观点。

```html
<div class="person-card">
  <div class="person-avatar">S</div>
  <div class="person-info">
    <div class="person-name">Sam Altman</div>
    <div class="person-title">CEO, OpenAI</div>
    <div class="person-quote">"我们的目标是让 AI 惠及全人类。"</div>
  </div>
</div>
```

**限制**：person-avatar 用首字母，person-name 不超过 10 字，person-quote 不超过 40 字。

---

## 通用组件

### divider — 分割线

```html
<div class="divider"></div>
```

### h3 — 小标题

```html
<h3>技术细节</h3>
```

**限制**：不超过 10 字。

### p — 正文段落

```html
<p>正文内容...</p>
```

### key-points — 要点列表

```html
<ul class="key-points">
  <li>要点一</li>
  <li>要点二</li>
</ul>
```

**限制**：每条不超过 25 字，3-5 条。
