# Phase 3D-A Auto-Publish Audit

Date: 2026-08-02

## Prior gap

- Review statuses: `pending | accepted | corrected | rejected | unresolved`
- Acceptance was human-gated (PATCH + Finish → `labAcceptedResults`)
- Confidence used only for UI grouping; envelope forced `requiresReview: true`

## Target

- Statuses: `pending_review | auto_published | user_accepted | user_corrected | rejected | unresolved`
- Central policy `LAB_AUTO_PUBLISH_POLICY_VERSION = 1.0.0`
- Exception-only review; high-confidence numeric-eq rows publish automatically

## Implemented

1. Status model rename + `auto_published` (legacy normalized on load)
2. Versioned metric import profiles + alias/unit registry expansion
3. Pure policy evaluator (`evaluateLabAutoPublish`) with per-dimension gates
4. Server orchestration after draft persist (`runLabAutoPublishAfterDraft`)
5. Import summary on review + document detail DTOs
6. Upload completion CTAs (View Labs / Review N)
7. Exception-first review UI (auto-published collapsed)
8. Override: reject unpublishes accepted+projection; correction rewrites immediately
9. Metric detail consumer provenance (“Imported automatically”)
10. Reprocess preserves rejected/user_corrected/user_accepted
11. Export packs drafts/reviews/accepted (retention registry marked covered)
12. Feature flag remains `EXPO_PUBLIC_LABS_OS_V1`

## Report A structural (counts only)

See final feature report section 21.
