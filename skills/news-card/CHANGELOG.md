# Changelog

All notable changes to the news-card skill are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] - 2026-03-27

### Spec Changes (Round A — docs only, no script modifications)

#### scoring-spec.md
- **Fixed**: Removed duplicate formula; single canonical formula with 7 dimensions
- **Fixed**: Unified `community` → `community_heat` as sole field name
- **Added**: `implementation_status` markers on all dimension sections
- **Added**: X/Twitter single-source policy (cannot enter tier-1 without cross-validation)
- **Added**: 2-Stage scoring concept (peer_review → future stage-2 rerank)
- **Added**: AI-domain stop words for Jaccard dedup (future)
- **Changed**: Recommended dedup threshold 0.6 → 0.7 (future)
- **Added**: Configurable recency timezone/windows (future)
- **Added**: `event_id` and `doc_role` interface definitions (future)
- **Updated**: Ben's Bites marked deprecated in peer_review signals

#### sources-spec.md
- **Changed**: X/Twitter accounts restructured into 3 tiers (official/builder/commentary)
- **Changed**: X authority_weight lowered from 5 to 3/2/1 by tier
- **Added**: `requires_confirmation: true` on all X sources
- **Added**: `status` field on newsletter and podcast sources
- **Added**: Chinese/Asian sources section (pending_verification)
- **Added**: Research sources — arXiv, Papers With Code (pending_verification)
- **Added**: Category-gap sources — NIST AI, Alignment Forum, cloud AI blogs (pending_verification)
- **Fixed**: Podcast authority_weight 5 → 3; placeholder URLs marked `status: placeholder`
- **Merged**: "其他社交媒体" section into tiered X structure

#### SKILL.md
- **Added**: Step 3 — Enrich (Pre-Curate) concept (future)
- **Changed**: Pipeline steps renumbered (old 3→4, 4→5, 5→6)
- **Added**: X single-source limitation in selection criteria
- **Changed**: Version 0.1.0 → 0.2.0
- **Changed**: Description updated to reflect 40+ sources including Chinese

### Implementation Notes (Round B — future)
- `requires_confirmation` to be enforced in score-engine.js
- 2-stage rerank to replace peer_review in main formula
- Enrichment step to generate `workspace/enriched.json`
- Event clustering to assign `event_id` and `doc_role`
- AI-domain stop words and 0.7 threshold to be applied in dedup.js
