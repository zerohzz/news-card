# Autoresearch v2 Changelog — news-card (Visual Density)

> Focus: Fix whitespace/density issues in HTML templates, especially feature page content gap.
> Mutation scope: SKILL.md + HTML templates (feature.html, half-page.html, briefs.html, cover.html)

## Experiment 0 — BASELINE

**Score:** 4/5 (80.0%)
**Change:** None — original templates
**Passing evals:**
- Half-Page Story Fill (PASS): All stories fill >= 60%
- No Excessive Bottom Whitespace (PASS): All pages < 25% bottom gap
- Minimum Font Size Compliance (PASS): All text meets minimums
- Inter-Element Gap Compliance (PASS): All gaps within limits
**Failing evals:**
- **Feature Page Content Fill** (FAIL): Gaps of 900-960px between content-body children and source-section on all 4 feature pages (max allowed: 200px)

**Root cause:** In `feature.html`, `.content-body` is `flex: 1` with `flex-direction: column`, but neither `.summary` nor `.highlight-box` expand to fill the available space. The `.summary` has fixed `font-size: 28px; line-height: 2.0` and the sample data's ~150-char summaries only fill ~3-4 lines. The remaining ~960px of the flex container is empty space between `.highlight-box` bottom and `.source-section` top (which has `margin-top: auto`).

---

## Experiment 1 — KEEP

**Score:** 5/5 (100.0%)
**Change:** Added `justify-content: space-between` to `.content-body` in `feature.html`
**Reasoning:** The `.content-body` flex container had 3 children (`.content-divider`, `.summary`, `.highlight-box`) stacked at the top with `flex-direction: column`, leaving ~960px of dead space before the `.source-section`. By adding `justify-content: space-between`, the children spread evenly across the available height, eliminating the concentrated gap.
**Result:** All 5 evals pass. Feature page gaps reduced from 900-960px to well under 200px. No regressions on other evals.
**Remaining failures:** None.

**Confirmed:** 100% pass rate for 3 consecutive runs (exp1-r1, exp1-r2, exp1-r3). Termination condition met.

---

