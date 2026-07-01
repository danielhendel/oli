# Oli Top 25 Keyframe Production Queue Standard v1

**Status:** Authoritative for Top 25 keyframe candidate production planning  
**Version:** top25-keyframe-candidate-production-queue-v1

---

## Purpose

Define a deterministic, planning-only production queue that maps Top 25 keyframe specs to future candidate image generation work items.

---

## Production queue is planning-only

The queue is a **planning artifact**. It does not:
- Create candidate assets
- Upload files
- Persist to backend
- Call AI APIs
- Approve media

---

## No candidate assets yet

Queue items have no `candidateId`, no asset path, and no storage reference.

M13 state: queue exists, assets do not.

---

## No generated media yet

Queue items describe what **should** be generated — not what has been generated.

---

## No approved-master statuses

Valid `productionStatus` values:
| Status | Meaning |
|--------|---------|
| `not-started` | No production initiated |
| `blocked` | Missing or invalid spec |
| `ready-for-generation` | Spec valid + expert-reviewed enrichment (none in M13) |
| `needs-expert-review` | Spec valid but enrichment not expert-reviewed |

Do not use `approved-master` or `media-approved` in queue items.

---

## How queue items map to future candidate generation

Each queue item represents one keyframe to produce:

```
exerciseId × keyframePoseId × renderTarget × requiredView
```

Fields carried forward to M14:
- `promptSeedSummary`
- `acceptanceCriteria`
- `negativeCriteria`
- `commonGenerationFailures`
- `qaFocus`

---

## Status definitions

- **not-started:** Default before M14 workflow begins
- **blocked:** Spec missing or fails validation
- **needs-expert-review:** Enrichment not expert-reviewed (M12/M13 default)
- **ready-for-generation:** Expert-reviewed enrichment + valid spec (future state)

---

## Prompt seed summary expectations

Format: `{exerciseName} — {poseLabel} — {characterId} — {requiredView} — {renderTarget}`

Deterministic, human-readable, no AI API calls.

---

## QA / acceptance / negative criteria expectations

Each queue item inherits pose-level criteria from its parent `ExerciseKeyframeSpec`:
- Acceptance criteria from enrichment/M9
- Negative criteria including global AI failure modes
- Common generation failures from enrichment `mediaProfile`
- QA focus from enrichment `imageQaFocus`

---

## Do-not-build-yet list

M13 queue sprint explicitly excludes:
- Backend persistence (Firestore, Storage)
- Upload flows
- CDN delivery
- AI API integration (Google Flow remains external)
- Fake expert approval
- Fake media approval
- Approved image packs
- Video from approved keyframes

---

## Sort order

1. Top 50 priority rank (ascending)
2. Pose sort order within exercise
3. Render target: `16:9` → `9:16` → `1:1`

Bench Press (rank 1) queue items appear first when `bench_press` is priority 1.
