---
name: first-time-setup
description: Blocking Step 0 flow for first-time user configuration
---

# First-Time Setup

## When to Trigger

This is a **blocking** step. Before any image generation:
1. Check if `EXTEND.md` exists (project-level or user-level)
2. If found → load preferences and proceed
3. If NOT found → run first-time setup below

## Setup Flow

> **CRITICAL**: This step MUST complete before proceeding.
> Do NOT: Ask about content/article, Ask about style or layout, Ask about target audience.
> Only ask the 3 questions below.

### Question 1: Watermark

```
Do you want a watermark on your images?
- Enter your XHS handle (e.g., @username)
- Or type "no" for no watermark (recommended for most users)
```

**Default**: No watermark.

### Question 2: Preferred Style

```
Do you have a preferred visual style?
Options: cute, fresh, warm, bold, minimal, retro, pop, notion, chalkboard, study-notes, screen-print
- Or type "none" to let the system auto-select based on content
```

**Default**: None (auto-select).

### Question 3: Save Location

```
Where should I save your preferences?
1. Project-level: .xhs-image/ (recommended for team projects)
2. User-level: ~/.xhs-image/ (shared across all projects)
```

**Default**: Project-level.

## Save Preferences

Write to `EXTEND.md` at chosen location:

```yaml
---
version: "1.0"
watermark:
  enabled: false
  # content: "@username"
  # position: bottom-right
style:
  preferred: none
  layout: none
language: auto
custom_styles: []
---
```

## Modifying Preferences

Users can:
- Edit `EXTEND.md` directly
- Delete `EXTEND.md` and re-run setup
