# Timeline continuous-feed physical decision

**Date:** 2026-07-18
**Worktree:** `/Users/danielhendel/oli-timeline-v1-impl`
**Branch / HEAD / tree:** `feat/timeline-v1` · `c3a550ae5c08b5811195720c82f468724ddd7fb0` · `72b6b9a8cbfc4f97221114e043692fe4d522be10`
**Feature PR:** #187 OPEN draft @ exact head above
**Stacked merges into feature:** #188, #189, #190, #191

Privacy-safe aggregate decision record. No screenshots, private dates, health values, titles, UIDs, IDs, cursors, URLs, tokens, or raw logs.

---

## 1. Physical evidence classification

| Gate | Result |
| --- | --- |
| ATTACH PROOF | PASS |
| CURRENT-DAY COLD OPEN | FAIL |
| CALENDAR TARGET ALIGNMENT | FAIL |
| FAST-SCROLL STABILITY | FAIL |
| RAIL/CARD PRESENCE | PASS |
| VISUAL HIERARCHY | NEEDS REDESIGN |
| REDBOX | 0 |
| BLANK SCREEN | 0 |
| VISIBLE BACKEND ERROR | 0 |

---

## 2. Product decision

**Freeze** the continuous multi-day Timeline feed as a release interaction.

**Do not abandon** Timeline.

**Reset** Timeline v1 to a deterministic **Daily Timeline** (one selected day).

Continuous history is deferred to **Timeline v2** research/implementation.

---

## 3. Local freeze execution

| Item | Result |
| --- | --- |
| Private capture stopped | YES |
| Raw evidence deleted | YES |
| `EXPO_PUBLIC_TIMELINE_FEED` | unset |
| `.env.local` ignored / untracked / mode 600 | YES |
| Approved public env names retained | YES |
| EAS/shared env changed | NO |
| Metro port 8084 | free |
| LOCAL_TIMELINE_FEED_FLAG_ROLLBACK | PASS |

---

## 4. Live platform retention

| Item | Result |
| --- | --- |
| Cloud Run traffic | 100% → `oli-api-00239-pih` |
| Digest | `sha256:1d5640e0314ca0249fdfd15630c30157d49c2c64a8823798693c5eafc712e8c9` |
| Gateway | Timeline feed config ACTIVE/attached |
| Function `onOuraPostRawRequested` | unchanged (`onourapostrawrequested-00054-sen`) |
| Logging exclusion hash | match `87f8c63c…` |
| Backend rollback | NOT performed |
| LIVE_TIMELINE_PLATFORM_RETAINED | YES |

Unauthenticated direct `/health` may return IAM `403`; service remains the live 100% revision with prior authenticated cutover evidence. No 5xx investigation required for this freeze decision.

---

## 5. Why platform is retained while UX is frozen

- Authenticated Timeline feed API is bounded and schema-valid.
- Workout reconciliation and normalize pipeline are correct product assets.
- Privacy/runtime guards are valuable independent of continuous scroll UX.
- Failures observed were mobile interaction / layout / hierarchy — not a mandate to roll back staging API.

---

## 6. Documents produced

- `docs/product/timeline-daily-v1-contract.md`
- `docs/plans/timeline-daily-v1-reset-plan.md`
- this audit

Not committed in this authorization.

---

## 7. Unverified gates (preserved)

- Full continuous matrix C/V/W/T/K/N/L after freeze (stopped at targeted FAIL)
- VoiceOver / Dynamic Type / light mode physical
- User A→B isolation
- Production performance claims from a development build
- Exact HTTP request budget from Metro-only capture

---

## 8. Next authorization

Implement Daily Timeline v1 as a focused deterministic day view using retained platform truth, then proceed to the next roadmap feature. Continuous Timeline history remains deferred.
