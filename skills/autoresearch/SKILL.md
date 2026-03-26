---
name: autoresearch
description: >
  Meta-skill that autonomously improves any Claude Code skill using Karpathy's
  autoresearch method. Runs the target skill repeatedly, scores output with
  binary evals, mutates the prompt one change at a time, keeps improvements,
  reverts regressions. Say "run autoresearch on [skill]" to start.
version: 0.1.0
---

# Autoresearch for Skills

Take any existing skill, define what "good output" looks like as binary yes/no checks, then run an autonomous loop that improves the skill's prompt until it consistently passes.

Based on Andrej Karpathy's autoresearch method: instead of manually improving something, let an AI agent do it in a loop. Try a small change. Check if the result got better. Keep it if it did, throw it out if it didn't. Repeat.

---

## Trigger

- "run autoresearch on [skill name]"
- "自动优化 [skill name]"
- `$autoresearch`

---

## Before Starting: Gather Context

You need 5 things before the loop can begin. Ask the user for each:

1. **Target skill** — exact path to the SKILL.md to optimize (e.g., `skills/news-card/SKILL.md`)
2. **Test inputs** — 3-5 varied prompts or scenarios that exercise different aspects of the skill
3. **Eval criteria** — 3-6 binary yes/no checks that define "good output" (see `eval-guide.md`)
4. **Runs per experiment** — how many times to run the skill per experiment (default: 5, higher = more reliable but slower)
5. **Budget cap** (optional) — max number of experiment cycles before stopping

If the user doesn't have eval criteria ready, help them write good ones. Walk through `eval-guide.md` together. Turn their vibes into specific yes/no questions.

---

## Step 1: Read the Skill

Before touching anything:

1. Read the full SKILL.md of the target skill
2. Read every file in its `references/` directory
3. Read its templates, examples, and any other referenced files
4. Identify: core job, process steps, output format, existing quality checks
5. Note existing anti-patterns, constraints, and design rules

You need to deeply understand the skill before you can improve it.

---

## Step 2: Build the Eval Suite

Create 3-6 binary evaluations. Each eval follows this format:

```
EVAL [N]: [Short name]
Question: [Yes/no question about the output]
Pass: [What "yes" looks like — one sentence, specific]
Fail: [What triggers "no" — one sentence, specific]
```

### Rules for Good Evals

- **Binary only.** Yes or no. No scales. No "rate 1-10." No vibes.
- **Specific.** "Does the output contain zero phrases from this banned list?" not "Is the writing good?"
- **Consistent.** Two different evaluations of the same output should agree.
- **Non-overlapping.** Each eval tests something distinct.
- **Non-gameable.** The skill can't pass by memorizing the test; it has to actually improve.
- **3-6 is the sweet spot.** More than 6 and the skill starts gaming the checklist.

Calculate: `max_score = num_evals × runs_per_experiment`

See `eval-guide.md` for detailed guidance, good/bad examples, and the 3-question test.

---

## Step 3: Generate the Live Dashboard

Create a single self-contained HTML file: `autoresearch-[skill-name]/dashboard.html`

### Requirements

- **Auto-refresh** every 10 seconds by reading `results.json`
- **Line chart** showing score progression (experiment # on X-axis, pass rate % on Y-axis)
- **Color-coded bars** per experiment: green = keep, red = discard, blue = baseline
- **Summary table**: experiment #, score, pass rate, status (keep/discard/baseline), description
- **Per-eval breakdown**: which evals pass/fail most across all experiments
- **Current status indicator**: running, paused, or complete
- Clean styling: white background, pastel accents, sans-serif font (this is a dashboard, not a news card)

### Technology

- Single HTML file, inline CSS and JavaScript
- Use Chart.js from CDN (`https://cdn.jsdelivr.net/npm/chart.js`) for line chart
- Read data from `results.json` in the same directory
- No build step, no server — just open in browser

### results.json Format

```json
{
  "skill_name": "[name]",
  "status": "running | paused | complete",
  "current_experiment": 3,
  "baseline_score": 70.0,
  "best_score": 90.0,
  "experiments": [
    {
      "id": 0,
      "score": 14,
      "max_score": 20,
      "pass_rate": 70.0,
      "status": "baseline",
      "description": "original skill — no changes"
    },
    {
      "id": 1,
      "score": 17,
      "max_score": 20,
      "pass_rate": 85.0,
      "status": "keep",
      "description": "added anti-pattern rule for vague headlines"
    }
  ],
  "eval_breakdown": [
    {"name": "Card Count", "pass_count": 8, "total": 10},
    {"name": "Correct Dimensions", "pass_count": 10, "total": 10}
  ]
}
```

**Action:** Open the dashboard in the browser immediately after creating it.

---

## Step 4: Establish Baseline

1. Create working directory: `autoresearch-[skill-name]/`
2. Create `results.tsv` with header row:
   ```
   experiment	score	max_score	pass_rate	status	description
   ```
3. Create `results.json` and `dashboard.html`, open dashboard in browser
4. Back up the original skill as `SKILL.md.baseline` in the working directory
5. Run the target skill **N times** using the test inputs
6. Score every output against every eval
7. Record baseline score in `results.tsv` and `results.json`

### results.tsv Format (tab-separated)

```
experiment	score	max_score	pass_rate	status	description
0	14	20	70.0%	baseline	original skill — no changes
```

### Confirmation

Show the user the baseline score and eval breakdown. If already 90%+, ask if they still want to proceed. Then enter the loop.

---

## Step 5: Run the Experiment Loop

This is the core. Run autonomously — **never pause between cycles asking for permission.**

### One Cycle

```
1. ANALYZE — which evals fail most? Read actual outputs. Spot patterns.
2. HYPOTHESIZE — pick ONE specific change that should fix the top failure.
3. MUTATE — make that single change to the target SKILL.md.
4. RUN — execute the skill N times with test inputs.
5. SCORE — evaluate every output against every eval. Calculate total.
6. DECIDE:
   - Score IMPROVED → KEEP. This is the new baseline.
   - Score SAME → DISCARD. Revert the change.
   - Score WORSE → DISCARD. Revert the change.
7. LOG — update results.tsv, results.json, changelog.md
8. REPEAT — go back to step 1.
```

### Good Mutations (one at a time)

- Add a specific instruction that addresses the most common failure
- Reword an ambiguous directive to be more precise
- Add an anti-pattern rule for a recurring mistake
- Elevate an important instruction higher in the prompt (priority = position)
- Add or improve a worked example showing correct behavior
- Remove an instruction that's causing over-optimization or conflicts

### Bad Mutations (never do these)

- Rewrite the entire skill from scratch
- Add 5+ rules at once (can't isolate what helped)
- Make vague changes ("improve the output quality")
- Add length without specific purpose

### Termination Conditions

The loop stops when ANY of these is true:

1. **95%+ pass rate for 3 consecutive experiments** — the skill is good enough
2. **Budget cap reached** — user-specified max cycles
3. **User manually stops** — user says stop or interrupts

---

## Step 6: Write the Changelog

Append to `autoresearch-[skill-name]/changelog.md` after EVERY experiment:

```markdown
## Experiment [N] — [KEEP / DISCARD]

**Score:** [X]/[max] ([percent]%)
**Change:** [One sentence describing the mutation]
**Reasoning:** [Why this change was expected to help]
**Result:** [What actually happened — which evals improved/regressed]
**Remaining failures:** [Brief description of what still fails]
```

This changelog is the most valuable artifact. When smarter models come out, hand them the changelog and they pick up where you left off.

---

## Step 7: Deliver Results

When the loop terminates, report:

1. **Score summary:** baseline → final (e.g., 56% → 92%)
2. **Total experiments run**
3. **Keep rate:** how many mutations were kept vs discarded
4. **Top 3 most impactful changes** (from changelog)
5. **Remaining failure patterns** (what the skill still gets wrong)
6. **Improved skill location:** the modified SKILL.md path
7. **Artifacts location:** dashboard, results, changelog paths

---

## Output File Structure

```
autoresearch-[skill-name]/
├── dashboard.html       # live browser dashboard (open this)
├── results.json         # dashboard data (updated after each experiment)
├── results.tsv          # score log (tab-separated, human-readable)
├── changelog.md         # detailed mutation history
└── SKILL.md.baseline    # original skill backup (untouched)
```

The improved skill is saved in-place (the original SKILL.md is modified). The backup in `.baseline` lets you revert anytime.

---

## Example: Optimizing the news-card Skill

**Context:**
- Target: `skills/news-card/SKILL.md`
- Test inputs: "今日 AI 日报", "generate AI digest", "今日 AI 日报 (focus on open source)"
- Runs per experiment: 5

**Suggested evals for news-card:**

```
EVAL 1: Card Count
Question: Does the run produce exactly 8 PNG files in the images/ directory?
Pass: Exactly 8 PNG files exist
Fail: Fewer or more than 8 PNG files

EVAL 2: Correct Dimensions
Question: Are all PNG files 2160×3840 pixels (@2x of 1080×1920)?
Pass: Every PNG is exactly 2160×3840px
Fail: Any PNG has different dimensions

EVAL 3: Tier Distribution
Question: Does digest.json contain exactly 4 tier-1, 4 tier-2, and 8 tier-3 items (16 total)?
Pass: 4+4+8=16 items with correct tier assignments
Fail: Wrong count or missing tier field

EVAL 4: Serif Fonts Only
Question: Do all generated HTML files use only serif font families (no sans-serif anywhere in CSS)?
Pass: Zero occurrences of sans-serif, Helvetica, Arial, or system-ui in any HTML file
Fail: Any sans-serif font declaration found

EVAL 5: Category Color Accuracy
Question: Does every item's color_tag in digest.json match its category per design-tokens.md?
Pass: All category→color mappings are correct (模型发布=#4A90D9, 产品应用=#7B68EE, etc.)
Fail: Any mismatch between category name and hex color value

EVAL 6: No Template Artifacts
Question: Are all generated HTML files free of unrendered template tags ({{, }}, #each, #if)?
Pass: Zero raw template syntax in any output HTML
Fail: Any {{...}} or similar template tag found in rendered output
```

**Hypothetical run:**
- Baseline: 60% (template artifacts on cover, wrong colors on 2 items)
- Exp 1 KEEP (75%): Fixed template engine nesting bug → template artifacts gone
- Exp 2 DISCARD (70%): Tried stricter color validation → broke tier-3 items
- Exp 3 KEEP (85%): Added explicit color mapping table to SKILL.md → color accuracy up
- Exp 4 KEEP (95%): Added worked example of correct digest.json → consistency across all evals
- Final: 60% → 95% in 4 experiments

---

## How This Connects to Other Skills

This skill can optimize ANY skill in your setup. Just point it at the SKILL.md and define evals.

Common targets:
- Writing skills (newsletters, tweets, emails) → eval for tone, length, structure
- Code generation skills → eval for correctness (actually run the code), style, completeness
- Visual/design skills → eval for dimensions, colors, text legibility
- Data processing skills → eval for output format, completeness, accuracy

---

## The Quality Checklist

A successful autoresearch run satisfies all of these:

- [ ] Started with a measured baseline before making any changes
- [ ] Used exclusively binary evals (no scales, no vibes)
- [ ] Changed exactly one thing per experiment
- [ ] Maintained a complete experiment log (results.tsv + changelog.md)
- [ ] Achieved measurable score improvement
- [ ] Avoided overfitting to test inputs (mutations are general, not input-specific)
- [ ] Ran autonomously without pausing between cycles for permission
