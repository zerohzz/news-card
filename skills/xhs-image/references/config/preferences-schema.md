---
name: preferences-schema
description: YAML schema for EXTEND.md user preferences
---

# Preferences Schema

## EXTEND.md Format

```yaml
---
version: "1.0"

watermark:
  enabled: true | false
  content: "@username"           # XHS handle or custom text
  position: bottom-right         # bottom-right | bottom-left | bottom-center | top-right

style:
  preferred: notion              # Any style name, or "none" for auto-select
  layout: balanced               # Any layout name, or "none" for auto-select

language: auto                   # zh | en | ja | ko | auto

custom_styles:
  - name: my-brand
    description: "Custom brand style"
    colors:
      primary: ["#1A1A2E", "#16213E"]
      background: ["#0F3460"]
      accent: ["#E94560"]
    visual_elements: "Geometric patterns, neon accents"
    typography: "Bold, futuristic"
    best_for: ["Brand content", "Tech announcements"]
---
```

## Field Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | string | yes | "1.0" | Schema version |
| `watermark.enabled` | bool | yes | false | Whether to add watermark |
| `watermark.content` | string | if enabled | — | Watermark text |
| `watermark.position` | enum | no | bottom-right | Watermark position |
| `style.preferred` | string | no | none | Default style |
| `style.layout` | string | no | none | Default layout |
| `language` | enum | no | auto | Output language |
| `custom_styles` | array | no | [] | User-defined styles |

## Custom Style Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Unique identifier (kebab-case) |
| `description` | string | yes | Human-readable description |
| `colors.primary` | array | no | Primary palette hex values |
| `colors.background` | array | no | Background colors |
| `colors.accent` | array | no | Accent colors |
| `visual_elements` | string | no | Description of visual elements |
| `typography` | string | no | Typography style description |
| `best_for` | array | no | Recommended content types |

## Minimal Example

```yaml
---
version: "1.0"
watermark:
  enabled: false
style:
  preferred: none
  layout: none
language: auto
custom_styles: []
---
```

## Full Example

```yaml
---
version: "1.0"
watermark:
  enabled: true
  content: "@tech_daily"
  position: bottom-right
style:
  preferred: notion
  layout: dense
language: zh
custom_styles:
  - name: tech-dark
    description: "Dark mode tech aesthetic"
    colors:
      primary: ["#00D4AA", "#00B4D8"]
      background: ["#0D1117", "#161B22"]
      accent: ["#F78166", "#D2A8FF"]
    visual_elements: "Circuit patterns, code snippets, terminal aesthetics"
    typography: "Monospace headers, clean sans body"
    best_for: ["Tech news", "Developer content", "AI updates"]
---
```
