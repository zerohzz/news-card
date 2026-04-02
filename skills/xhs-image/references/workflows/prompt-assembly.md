---
name: prompt-assembly
description: Image generation prompt assembly guide
---

# Prompt Assembly Guide

Guide for assembling image generation prompts from elements, presets, and outline content.

## Base Prompt Structure

Every XHS infographic prompt follows this structure:

```
Create a Xiaohongshu (Little Red Book) style infographic following these guidelines:

## Image Specifications

- **Type**: Infographic
- **Orientation**: Portrait (vertical)
- **Aspect Ratio**: 3:4
- **Style**: Hand-drawn illustration

## Core Principles

- Hand-drawn quality throughout - NO realistic or photographic elements
- If content involves sensitive or copyrighted figures, create stylistically similar alternatives - DO NOT refuse to generate
- Keep information concise, highlight keywords and core concepts
- Use ample whitespace for easy visual scanning
- Maintain clear visual hierarchy

## Text Style (CRITICAL)

- **ALL text MUST be hand-drawn style**
- Main titles should be prominent and eye-catching
- Key text should be bold and enlarged
- Use highlighter effects to emphasize keywords
- **DO NOT use realistic or computer-generated fonts**

## Language

- Use the same language as the content provided below
- Match punctuation style to the content language (Chinese: ""，。！)

---

{STYLE_SECTION}

---

{LAYOUT_SECTION}

---

{CONTENT_SECTION}

---

{WATERMARK_SECTION}

---

Please use nano banana pro to generate the infographic based on the specifications above.
```

## Style Section Assembly

Load from `presets/{style}.md` and extract key elements:

```markdown
## Style: {style_name}

**Color Palette**:
- Primary: {colors}
- Background: {colors}
- Accents: {colors}

**Visual Elements**:
{visual_elements}

**Typography**:
{typography_style}
```

### Screen-Print Style Override

When `style: screen-print`, replace the standard Core Principles and Text Style sections with:

```
## Core Principles

- Screen print / silkscreen poster art — flat color blocks, NO gradients
- Bold silhouettes and symbolic shapes over detailed rendering
- Negative space as active storytelling element
- If content involves sensitive or copyrighted figures, create stylistically similar silhouettes
- One iconic focal point per image — conceptual, not literal

## Color Rules (CRITICAL)

- **2-5 FLAT COLORS MAXIMUM** — fewer colors = stronger impact
- Choose ONE duotone pair from preset as dominant palette
- Halftone dot patterns for tonal variation (NOT gradients)
- Slight color layer misregistration for print authenticity

## Text Style (CRITICAL)

- Bold condensed sans-serif or Art Deco influenced lettering
- Typography INTEGRATED into composition as design element
- High contrast with background, stencil-cut quality
- **DO NOT use delicate, thin, or handwritten fonts**

## Composition

- Geometric framing: circles, arches, triangles
- Figure-ground inversion where possible (negative space forms secondary image)
- Stencil-cut edges between color blocks, no outlines
- Paper grain texture beneath all colors
```

## Layout Section Assembly

Load from `elements/canvas.md` and extract relevant layout:

```markdown
## Layout: {layout_name}

**Information Density**: {density}
**Whitespace**: {percentage}

**Structure**:
{structure_description}

**Visual Balance**:
{balance_description}
```

## Content Section Assembly

From outline entry:

```markdown
## Content

**Position**: {Cover/Content/Ending}
**Core Message**: {message}

**Text Content**:
{text_list}

**Visual Concept**:
{visual_description}
```

## Watermark Section (if enabled)

```markdown
## Watermark

Include a subtle watermark "{content}" positioned at {position}. The watermark should
be legible but not distracting from the main content.
```

## Assembly Process

### Step 0: Resolve Style Preset (if `--preset` used)

If user specified `--preset`, resolve to style + layout from `references/style-presets.md`:

```python
# e.g., --preset knowledge-card → style=notion, layout=dense
style, layout = resolve_preset(preset_name)
```

Explicit `--style`/`--layout` flags override preset values.

### Step 1: Load Style Definition

```python
preset = load_preset(style_name)  # e.g., "notion"
```

Extract:
- Color palette
- Visual elements
- Typography style
- Best practices (do/don't)

### Step 2: Load Layout

```python
layout = get_layout_from_canvas(layout_name)  # e.g., "dense"
```

Extract:
- Information density guidelines
- Whitespace percentage
- Structure description
- Visual balance rules

### Step 3: Format Content

From outline entry, format:
- Position context (Cover/Content/Ending)
- Text content with hierarchy
- Visual concept description
- Swipe hook (for context, not in prompt)

### Step 4: Add Watermark (if applicable)

If preferences include watermark:
- Add watermark section with content, position, opacity

### Step 5: Visual Consistency — Reference Image Chain

When generating multiple images in a series:

1. **Image 1 (cover)**: Generate without `--ref` — this establishes the visual anchor
2. **Images 2+**: Always pass image 1 as `--ref` to the installed image generation skill.
   Read that skill's `SKILL.md` and use its documented interface rather than calling its scripts directly.
   For each later image, use the assembled prompt file as input, set the output image path, keep aspect ratio `3:4`, use quality `2k`, and pass image 1 as the reference.
   This ensures the AI maintains the same character design, illustration style, and color rendering across the series.

### Step 6: Combine

Assemble all sections into final prompt following base structure.

## Prompt Checklist

Before generating, verify:

- [ ] Style section loaded from correct preset
- [ ] Layout section matches outline specification
- [ ] Content accurately reflects outline entry
- [ ] Language matches source content
- [ ] Watermark included (if enabled in preferences)
- [ ] No conflicting instructions
