# Oli Top 25 Keyframe Spec Registry Standard v1

**Status:** Authoritative for Top 25 keyframe spec expansion  
**Version:** top25-keyframe-spec-registry-v1

---

## Purpose

Convert M12 Top 25 exercise enrichment media requirements into validated `ExerciseKeyframeSpec` production blueprints — the specification layer before any candidate image generation.

---

## Relationship to M12 enrichment

```
EXERCISE_LIBRARY_V1
→ ExerciseLibraryEnrichmentV1 (M12)
→ ExerciseKeyframeSpec (M13)
→ Candidate Image Assets (M14)
```

- Every Top 25 spec is keyed by canonical `exerciseId` from `TOP25_EXERCISE_ENRICHMENT_IDS`.
- Enrichment `mediaProfile.keyframeRequirements` drive required poses, views, and render targets.
- Enrichment `reviewStatus` maps to spec `reviewStatus` — **not media approval**.

---

## Relationship to M9 Bench Press keyframe spec

`bench_press` uses the hand-authored M9 `buildBenchPressKeyframeSpec()` — the gold standard.

Required poses:
- `setup`
- `start_lockout`
- `bottom_chest_pause`
- `finish_lockout`

Character: `oli_motion_male_m1`

Do not replace the Bench Press spec with a generic enrichment builder unless tests prove exact compatibility.

---

## Additive-only rule

- Do not replace `EXERCISE_LIBRARY_V1`.
- Do not rename canonical exerciseIds.
- Do not create competing catalog layers.

---

## Canonical exerciseId preservation

All registry entries must match enrichment and library IDs exactly. No normalization or aliasing.

---

## Character registry dependency

Every spec must reference a valid `OliCharacterId` from `oliCharacterRegistry`:
- `oli_motion_male_m1`
- `oli_motion_female_f1`

Default character comes from enrichment `preferredCharacterIds` — do not silently invent IDs.

---

## Required pose criteria

Every Top 25 spec must include:
- `setup` pose
- `finish` or exercise-specific finish equivalent
- Minimum 3 poses total

Bench Press uses M9-specific pose IDs (see above).

Each pose must have:
- Pose-specific acceptance criteria
- Pose-specific negative criteria

---

## Required view criteria

Minimum one master review view (`front_45_right` preferred).

---

## Render target criteria

Minimum `16:9` required. Include `9:16` and `1:1` when enrichment provides them.

---

## QA criteria standard

Every spec must include:
- Global acceptance criteria
- Global negative criteria
- `commonGenerationFailures` from enrichment
- `qaFocus` areas
- `bodyRequirements` and equipment visibility requirements

---

## No fake expert approval rule

`reviewStatus: ready-for-expert-review` means structurally complete — **not expert-approved**.

Do not mark specs `expert-reviewed` without real expert sign-off.

---

## No fake media approval rule

Keyframe specs are production blueprints only.

They do **not**:
- Create candidate images
- Approve image packs
- Imply `approved-master` status
- Reference `candidateId` or `imagePackId`

Readiness label `spec-ready` means spec-complete — **not media-ready**.

---

## How this feeds M14 candidate image production

M14 will use:
- `buildTop25KeyframeCandidateProductionQueue()` — planning queue derived from specs
- Per-pose, per-render-target queue items with prompt seeds and QA criteria
- No auto-approval or asset creation in M13/M14 planning layers

Production chain:

```
Keyframe Spec → Candidate Generation → Candidate Review → Approved Master Image Pack → Playback
```

M13 completes the Keyframe Spec step for all Top 25 exercises.
