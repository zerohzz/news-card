# Autoresearch Changelog — news-card

## Experiment 0 — BASELINE

**Score:** 4/6 (66.7%)
**Change:** None — original skill
**Failing evals:**
- **Output File Count** (FAIL): Only 2/8 PNGs generated. Playwright timed out on 6 of 8 pages waiting for Google Fonts CDN to respond.
- **Text Fit and Legibility** (FAIL): Screenshots failed, so visual output could not be verified.

**Root cause:** All 4 HTML templates include `<link href="https://fonts.googleapis.com/css2?...">` which blocks Playwright's `page.screenshot()` when the CDN is unreachable. The browser waits for fonts to load before rendering, causing a 30s timeout on most pages.

---

## Experiment 1 — KEEP

**Score:** 6/6 (100.0%)
**Change:** Added route interception in `screenshot-playwright.js` to abort all requests to `fonts.googleapis.com` and `fonts.gstatic.com` before loading pages.
**Reasoning:** The Google Fonts link caused Playwright to hang waiting for font downloads in offline/restricted environments. By blocking these requests at the browser network level, pages render immediately using fallback serif fonts from the font stack.
**Result:** All 8 PNGs now generate successfully. All 6 evals pass. Visual inspection confirms text is readable with fallback fonts (Noto Serif SC / Source Serif Pro from the serif stack).
**Remaining failures:** None.

**Confirmed:** 100% pass rate for 3 consecutive runs (exp1, exp1-confirm1, exp1-confirm2). Termination condition met.

---

## Visual observations (not captured by current evals)

During visual review of the 8 PNG cards, I noted:
1. **Feature pages** (pages 1-4): Large whitespace gap between summary text and highlight box. The `summary` div doesn't fill the content area. A density-focused eval could catch this.
2. **Half-page** (pages 5-6): Moderate gap between the two stories. Could benefit from larger font sizes or more content per story.
3. **Cover page** and **Briefs page**: Look good — dense, readable, properly color-coded.

These are potential targets for future autoresearch runs with density-focused evals.
