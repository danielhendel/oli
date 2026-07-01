# Oli Exercise Library Enrichment Standard v1

**Status:** Authoritative for additive exercise library enrichment  
**Version:** exercise-library-enrichment-v1

---

## Purpose

Define the additive enrichment layer that extends `EXERCISE_LIBRARY_V1` with world-class exercise intelligence for Workout Studio, Exercise Academy, and Exercise Media OS — without replacing the canonical catalog.

---

## Relationship to EXERCISE_LIBRARY_V1

```
EXERCISE_LIBRARY_V1
→ ExerciseLibraryEnrichmentV1
→ Exercise Academy / Workout Studio / Media OS
```

- `EXERCISE_LIBRARY_V1` remains the **single canonical exercise source** (exerciseId, name, equipment, muscles).
- Enrichment is keyed by canonical `exerciseId` only.
- Enrichment **adds** detail; it does not create a competing catalog.
- Canonical identity fields always win in merge adapters.

---

## Additive-only rule

Do not replace, restructure, or duplicate `EXERCISE_LIBRARY_V1`.  
Do not rename canonical exerciseIds.  
Do not introduce alternate ID schemes.

---

## Review status definitions

| Status | Meaning |
|--------|---------|
| `draft` | Incomplete enrichment — not ready for review |
| `ready-for-expert-review` | Metadata structurally complete — **not expert-approved** |
| `expert-reviewed` | Human expert sign-off recorded |
| `deprecated` | Superseded — do not use for new production |

**M12 default:** `ready-for-expert-review`

Metadata completeness ≠ expert approval.

---

## Profile standards

### Movement profile
Plane of motion, laterality, kinetic chain, setup/start/end positions, ROM definition, tempo defaults, stability and skill demands.

### Programming profile
Training uses, rep ranges, block types, progression/regression strategy, volume counting rules, pairing guidance.

### Coaching profile
Setup, execution, breathing, feel cues, common mistakes, corrections, client summary, lesson focus.

### Safety profile
Contraindication notes (educational, not medical diagnosis), caution flags, pain signals, form breakdown risks, load management.

### Substitution profile
Regressions, progressions, lateral and equipment substitutions — all `exerciseId` references must exist in `EXERCISE_LIBRARY_V1`.

### Media / keyframe requirement profile
Bridge to M9/M10/M11 pipeline:
- Preferred character IDs (`oli_motion_male_m1`, `oli_motion_female_f1`)
- Keyframe pose requirements with acceptance and negative criteria
- Render targets (minimum `16:9`)
- Equipment/body visibility requirements
- Common AI generation failure risks
- Image and future video QA focus areas

---

## Readiness score definitions

| Label | Meaning |
|-------|---------|
| `not-started` | No enrichment |
| `partial` | Incomplete or validation errors |
| `metadata-ready` | Structural completeness |
| `ready-for-expert-review` | Complete metadata awaiting expert sign-off |
| `expert-reviewed` | Expert-approved enrichment |
| `media-planning-ready` | Media requirements defined — **not media approved** |

---

## No fake expert approval

Do not mark enrichment `expert-reviewed` without explicit human review and documentation.

## No fake media approval

Enrichment media profiles define **requirements**, not approved assets.  
Enrichment does not approve candidates, image packs, or video assets.

---

## Related documents

- Oli Top 50 Exercise Media Expansion Plan v1
- Oli Bench Press Hero Demo QA Standard v1
- Oli Bench Press Keyframe Image Pack QA Standard v1
