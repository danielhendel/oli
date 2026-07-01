# Oli Top 25 Expert Review Gate Standard v1

**Status:** Authoritative for Top 25 expert review before candidate production  
**Version:** exercise-expert-review-v1

---

## Purpose

Gate candidate image production until enrichment and keyframe specs receive human expert sign-off for production use.

---

## Expert review is required before candidate production

No Top 25 exercise may generate `ready-for-external-generation` production packets until expert review status is `approved-for-production`.

---

## Review status definitions

| Status | Meaning |
|--------|---------|
| `not-started` | Review not begun (M14 live default) |
| `in-review` | Review in progress |
| `changes-requested` | Expert requested changes — production blocked |
| `approved-for-production` | Approved for candidate image production — **not media approval** |
| `rejected` | Rejected for production |
| `superseded` | Superseded by newer review |

---

## Checklist standard

All booleans must be `true` for `approved-for-production`:
- movementProfileAccurate
- programmingGuidanceSafe
- coachingCuesClear
- safetyNotesConservative
- substitutionsValid
- keyframeRequirementsAccurate
- mediaQaCriteriaComplete
- noMedicalClaims

Also requires `reviewedBy` and `reviewedAt`.

---

## Production approval is not media approval

`approved-for-production` means:
> Enrichment + keyframe spec may be used for external candidate image generation.

It does **not** mean:
- approved-master candidates
- approved image packs
- playable approved media

---

## No fake expert approval rule

Live `TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1` must not mark exercises `approved-for-production` without real review.

Test fixtures may simulate approval — fixtures are not live data.

---

## Relationships

```
M12 Enrichment → M13 Keyframe Spec → M14 Expert Review Gate → M14 Production Packets → External Google Flow
```

M14 production packets remain blocked until this gate approves an exercise.
