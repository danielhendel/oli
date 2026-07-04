# Official Oli Exercise Image Production + Import Audit

**Audit title:** Sprint Media-Audit — Official Oli Exercise Image Production + Import Audit  
**Audit date:** 2026-06-30  
**Scope:** Repo truth only — **no source implementation changes** during this audit  
**Git working tree at audit time:** Uncommitted UX-3.4.x professional studio changes; media pipeline files unchanged by this audit

---

## 1. Executive Summary

### Current state

Oli already has a **substantial local-only Exercise Media OS** in `apps/professional/src/features/exercise-media-os/` that supports the full **planning → external generation → import → dev-test candidate → human QA → approved-master image pack** lifecycle — but **almost no real image files exist yet**.

| Layer | Status |
| --- | --- |
| Canonical exercise library | `EXERCISE_LIBRARY_V1` — **469** exercises (`lib/workouts/exercises/library.v1.ts`) |
| Enrichment (Top 25) | **25** entries (`lib/workouts/exercises/enrichment/top25ExerciseEnrichmentEntries.ts`) |
| Top 50 priority plan | **50** ranked exercises (`lib/workouts/exercises/enrichment/top50ExercisePriorityPlan.v1.ts`) |
| Top 25 keyframe specs | **25/25** spec-ready (`buildTop25KeyframeSpecRegistryReadiness`) |
| Top 25 production queue | **300** queue items (pose × render target × view per exercise) |
| Top 25 prompt packets | **300** packets — **0 ready**, **300 blocked** (expert review gate) |
| Bench Press pilot | Full spec, import manifest, QA worksheets, image pack builder — **0 PNG keyframes on disk** |
| Public media files | **2 README.md only** under `apps/professional/public/media/exercises/bench_press/` |
| Workout Studio thumbnails | Placeholders for most exercises; resolver hard-coded to `bench_press` only |
| Google Flow integration | **External/manual only** — prompt packets in code, no API calls |

### Recommendation

**Yes — Oli should create official exercise images centrally** using Google Flow + **Oli Male Trainer** (mapped to repo character `oli_motion_male_m1`). The repo pipeline is the correct source of truth. Professionals should **not** upload canonical images now.

### Staged rollout (repo-validated)

| Phase | Scope | Rationale |
| --- | --- | --- |
| **Phase 0** | Prove loop on `bench_press` only | Only exercise with authoritative M9 spec, M14 import manifest, M10/M11 review + image pack wiring |
| **Phase 1** | Top 25 **cover** images (1× 16:9 per exercise) | Fast library card wins; 25 images vs 300 full keyframe packets |
| **Phase 2** | Top 25 **full 16:9 keyframe packs** (setup/start/bottom/finish per spec) | Lesson playback, image sequence, coaching fidelity |
| **Phase 3** | Top 50 cover images | Uses `top50ExercisePriorityPlan.v1.ts` ranks 26–50 |
| **Phase 4** | Top 50 full keyframes where complexity warrants | Skip low-complexity isolations if cover suffices |
| **Phase 5** | Remaining **469 − 50** exercises | Requires enrichment expansion beyond Top 25 |

**Do not** start with 300 Google Flow generations across Top 25 before Bench Press loop is proven and expert review gate is cleared.

### Professional upload now?

**No.** Custom/professional images should remain a **future, non-canonical** path. Normal Workout Studio has no upload control and should not gain one in the primary builder.

### Readiness score

| Dimension | Score | Notes |
| --- | --- | --- |
| Pipeline architecture (types, gates, tests) | **8.0 / 10** | M9–M15 surface is strong |
| Authoritative docs | **8.5 / 10** | 12 standards under `docs/authoritative/Oli*.md` |
| Real approved media on disk | **0.5 / 10** | No PNG/JPG/WebP in `public/media/exercises/` |
| Thumbnail integration (all exercises) | **3.0 / 10** | `resolveExerciseThumbnail.ts` is `bench_press`-only |
| Expert review gate | **2.0 / 10** | All 25 exercises `not-started`; 0 production-approved |
| Google Flow character mapping | **4.0 / 10** | `oli_motion_male_m1` exists; no `externalToolCharacterName` |
| **Overall official image production readiness** | **5.5 / 10** | Ready to **produce**, not ready to **display at scale** |

---

## 2. Current Repo Map

### 2.1 Canonical exercise identity

| File | Role |
| --- | --- |
| `lib/workouts/exercises/library.v1.ts` | `EXERCISE_LIBRARY_V1` — 469 canonical `exerciseId` values |
| `lib/workouts/exercises/enrichment/types.ts` | Enrichment schema |
| `lib/workouts/exercises/enrichment/libraryEnrichment.v1.ts` | Top 25 enrichment export |
| `lib/workouts/exercises/enrichment/top25ExerciseEnrichmentEntries.ts` | 25 enrichment builders |
| `lib/workouts/exercises/enrichment/top50ExercisePriorityPlan.v1.ts` | Top 50 priority ranks |
| `apps/professional/src/features/workout-studio/exerciseLibraryAdapter.ts` | Professional adapter over `EXERCISE_LIBRARY_V1` |

### 2.2 Character Registry

| File | Role |
| --- | --- |
| `apps/professional/src/features/exercise-media-os/character-registry/types.ts` | `OliCharacterId`, wardrobe, rights types |
| `apps/professional/src/features/exercise-media-os/character-registry/oliCharacterRegistry.ts` | `oli_motion_male_m1`, `oli_motion_female_f1` |
| `apps/professional/src/features/exercise-media-os/character-registry/validateOliCharacterRegistry.ts` | Registry validation |
| `apps/professional/src/features/exercise-media-os/character-registry/__tests__/oliCharacterRegistry.test.ts` | Tests |

**Character IDs today:** `oli_motion_male_m1`, `oli_motion_female_f1`  
**Male display name in repo:** `"Oli Motion Male M1"` — **not** `"Oli Male Trainer"`  
**Google Flow name mapping:** **Missing** — no `externalToolCharacterName` field in types

### 2.3 Keyframe specs

| File | Role |
| --- | --- |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/types.ts` | Pose IDs, render targets, review status |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/buildBenchPressKeyframeSpec.ts` | Authoritative Bench Press M9 spec |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/buildExerciseKeyframeSpecFromEnrichment.ts` | Auto spec from enrichment |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/buildTop25ExerciseKeyframeSpecRegistry.ts` | 25-exercise registry |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/data/top25ExerciseKeyframeSpecs.ts` | Static export |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/validateTop25ExerciseKeyframeSpecRegistry.ts` | Registry validation |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/buildTop25KeyframeSpecRegistryReadiness.ts` | Readiness report |
| `apps/professional/src/features/exercise-media-os/keyframe-spec/buildTop25KeyframeCandidateProductionQueue.ts` | 300-item production queue |

**Bench Press poses (authoritative):** `setup`, `start_lockout`, `bottom_chest_pause`, `finish_lockout`  
**Top 25 spec count:** 25 valid specs; `expertReviewedCount: 0`; `mediaApprovedCount: 0`

### 2.4 Google Flow prompt packets & candidate production

| File | Role |
| --- | --- |
| `apps/professional/src/features/exercise-media-os/candidate-production/types.ts` | `GoogleFlowPromptPacket`, import manifest types |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildCandidateImagePromptPacket.ts` | Deterministic prompt text |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildExpectedKeyframeImportPaths.ts` | Path convention |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildTop25CandidateImageProductionPackets.ts` | 300 packets |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildCandidateImageImportManifest.ts` | Generic import manifest |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildMediaCandidateFromImageImport.ts` | Import → candidate |
| `apps/professional/src/features/exercise-media-os/candidate-production/data/benchPressCandidateImageProductionPackets.ts` | Bench Press packets |
| `apps/professional/src/features/exercise-media-os/candidate-production/data/benchPressKeyframeImportManifest.v1.ts` | File presence map |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildBenchPressKeyframeImportManifest.ts` | Bench Press manifest builder |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildBenchPressImportedImageCandidates.ts` | Import → dev-test candidates |
| `apps/professional/src/features/exercise-media-os/candidate-production/buildBenchPressImportedCandidateReviewState.ts` | Post-import review state |

**Live packet stats:** `totalPackets: 300`, `readyPacketCount: 0`, `blockedPacketCount: 300`  
**Bench Press queue items:** 12 (4 poses × 3 render targets `16:9`, `9:16`, `1:1`)

### 2.5 Candidate review & human QA

| File | Role |
| --- | --- |
| `apps/professional/src/features/exercise-media-os/candidate-review/types.ts` | Candidate statuses, QA dimensions, rights |
| `apps/professional/src/features/exercise-media-os/candidate-review/buildCandidateQaScore.ts` | Scoring |
| `apps/professional/src/features/exercise-media-os/candidate-review/validateMediaCandidate.ts` | Validation |
| `apps/professional/src/features/exercise-media-os/candidate-review/buildCandidateReviewState.ts` | Review aggregation |
| `apps/professional/src/features/exercise-media-os/candidate-review/candidateReviewStatusTransitions.ts` | Status FSM — blocks `missing → approved-master` |
| `apps/professional/src/features/exercise-media-os/candidate-review/buildCandidateImageQaWorksheet.ts` | Generic human QA worksheet |
| `apps/professional/src/features/exercise-media-os/candidate-review/buildBenchPressKeyframeCandidateQaWorksheet.ts` | Bench Press keyframe worksheet |
| `apps/professional/src/features/exercise-media-os/candidate-review/buildCandidateImageQaReadiness.ts` | Human review readiness labels |

**Note:** User-requested paths `candidate-review/human-qa/*` **do not exist** as a folder. Human QA lives in `buildCandidateImageQaWorksheet.ts` and Bench Press specialization.

### 2.6 Image packs

| File | Role |
| --- | --- |
| `apps/professional/src/features/exercise-media-os/image-pack/types.ts` | `ApprovedMasterImagePack`, `BENCH_PRESS_KEYFRAME_PUBLIC_PATHS` |
| `apps/professional/src/features/exercise-media-os/image-pack/buildApprovedMasterImagePack.ts` | Pack builder with `requireFilesInRepo` |
| `apps/professional/src/features/exercise-media-os/image-pack/validateApprovedMasterImagePack.ts` | Validation |
| `apps/professional/src/features/exercise-media-os/image-pack/buildBenchPressImagePack.ts` | Live Bench Press pack |
| `apps/professional/src/features/exercise-media-os/image-pack/buildBenchPressImageSequencePlaybackPlan.ts` | Sequence playback |
| `apps/professional/src/features/exercise-media-os/image-pack/data/benchPressKeyframeImageCandidates.ts` | **Empty array** — no live candidates |

### 2.7 Thumbnail resolution (Workout Studio)

| File | Role |
| --- | --- |
| `apps/professional/src/features/workout-studio/resolveExerciseThumbnail.ts` | Thumbnail source resolver |
| `apps/professional/src/components/workout-studio/ExerciseThumbnail.tsx` | Render + placeholder |
| `apps/professional/src/components/workout-studio/WorkoutLibraryPanel.tsx` | Library cards (`hideStatusBadge`) |
| `apps/professional/src/components/workout-studio/WorkoutExercisePrescriptionRow.tsx` | Builder exercise row |
| `apps/professional/src/features/workout-studio/__tests__/exerciseThumbnailResolver.test.ts` | Resolver tests |

### 2.8 Public media folders & files

```
apps/professional/public/media/exercises/
└── bench_press/
    ├── README.md
    └── keyframes/
        └── README.md
```

**Actual image files on disk:** **0** PNG/JPG/WebP  
**Expected Bench Press keyframe paths (from `benchPressKeyframeImportManifest.v1.ts`):**

| Pose | Public path |
| --- | --- |
| setup | `/media/exercises/bench_press/keyframes/setup-16x9.png` |
| start_lockout | `/media/exercises/bench_press/keyframes/start-lockout-16x9.png` |
| bottom_chest_pause | `/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png` |
| finish_lockout | `/media/exercises/bench_press/keyframes/finish-lockout-16x9.png` |

All `fileExists: false` in `BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1`.

### 2.9 Authoritative documentation

| Doc | Topic |
| --- | --- |
| `docs/authoritative/Oli Google Flow Prompt Packet Standard v1.md` | Prompt packet structure |
| `docs/authoritative/Oli Candidate Image Production Workflow Standard v1.md` | M14 workflow |
| `docs/authoritative/Oli First Keyframe Candidate Import QA Standard v1.md` | Import QA |
| `docs/authoritative/Oli Bench Press Keyframe Image Pack QA Standard v1.md` | Image pack QA |
| `docs/authoritative/Oli Bench Press Keyframe Candidate Review Checklist v1.md` | Review checklist |
| `docs/authoritative/Oli Top 25 Keyframe Spec Registry Standard v1.md` | Registry standard |
| `docs/authoritative/Oli Top 25 Keyframe Production Queue Standard v1.md` | Queue standard |
| `docs/authoritative/Oli Top 25 Expert Review Gate Standard v1.md` | Expert gate |
| `docs/authoritative/Oli Top 50 Exercise Media Expansion Plan v1.md` | Expansion plan |
| `docs/authoritative/Oli Exercise Library Enrichment Standard v1.md` | Enrichment |
| `docs/authoritative/Oli Bench Press Hero Demo QA Standard v1.md` | Video hero demo (separate from keyframe images) |

### 2.10 Internal UI surfaces (not normal pro builder)

Media factory panels render inside **Exercise Experience Studio → Media tab** only:

- `CandidateImageProductionPanel.tsx`
- `BenchPressKeyframeCandidateImportPanel.tsx`
- `CandidateReviewPanel.tsx`
- `ImagePackReadinessPanel.tsx`
- `Top25KeyframeSpecReadinessPanel.tsx`

Wired from `apps/professional/src/components/workout-studio/exercise-card/ExerciseMediaTab.tsx`.

---

## 3. Official Image Source-of-Truth Recommendation

### Canonical pipeline (preserve)

```
EXERCISE_LIBRARY_V1 (exerciseId)
  → Exercise Library Enrichment (Top 25 today)
  → Character Registry (oli_motion_male_m1)
  → Keyframe Spec (poses, views, render targets, QA criteria)
  → Google Flow Prompt Packet (external/manual)
  → Exported PNG in public/media/exercises/{exerciseId}/keyframes/
  → Import Manifest (file presence metadata in code)
  → Draft / Dev-Test Candidate (never auto approved)
  → Human QA Worksheet + QA Score
  → Approved-Master Candidate (manual promotion only)
  → Approved Master Image Pack
  → resolveExerciseThumbnail → Workout Library / Builder / Client Preview
```

### Hero vs keyframe vs cover

| Asset type | Recommendation |
| --- | --- |
| **Keyframe images** | **Primary source of truth** — already modeled in M9–M15 |
| **Cover / library thumbnail** | **Derived alias** in Phase 1 — use one designated keyframe (see §5) |
| **Separate `/cover/` folder** | **Defer** until Phase 2+ unless product needs crop distinct from keyframes |
| **Hero demo video** | **Separate track** — `bench_press` video README; not library thumbnail |

### Library thumbnail frame selection

For workout builder + exercise library cards, recommend:

1. **Approved-master** `start_lockout` or `setup` at **16:9** (most recognizable for compounds)
2. For isolations: **mid-ROM or top** pose per enrichment `media.keyframeRequirements`
3. Explicit `coverImagePoseId` field in image pack metadata (future Media-I2)

**Do not** fake approved-master until human QA passes and `buildApprovedMasterImagePack` validates with `requireFilesInRepo: true`.

### Staged rollout evaluation

The user's Phase 1–5 hypothesis is **correct** with repo adjustments:

- **Phase 1 cover-only** should mean **1× 16:9 keyframe per exercise** (not a new asset class yet) — still imported through existing manifest/candidate path
- **Full keyframe packs** mean all required poses × render targets per spec — **300 packets** for Top 25 today (too large for first batch)
- **Top 50** has priority plan but **no enrichment/spec registry** beyond Top 25 — Phase 3+ needs new enrichment entries

---

## 4. Google Flow + Oli Male Trainer Workflow

### External/manual workflow (no API)

1. **Unlock expert review** for target exercise (or use fixture in dev)
2. **Read production packet** from `buildTop25CandidateImageProductionPackets` or Bench Press data file
3. **Copy `promptPacket.fullPromptText`** into Google Flow
4. **Select character:** Google Flow **"Oli Male Trainer"** — operator maps mentally to `oli_motion_male_m1` until `externalToolCharacterName` is added
5. **Generate single still image** per packet (not video)
6. **Export PNG** using exact filename from `expectedImport.expectedFileName`
7. **Place file** at `expectedImport.expectedRepoPath`
8. **Update file presence map** in manifest data (e.g. `BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1`)
9. **Run import builders** → dev-test candidates only
10. **Complete human QA worksheet** → manual status promotion
11. **Build image pack** → only if all required frames pass QA and files exist

### Prompt packet must include

Already present in `GoogleFlowPromptPacket` + `buildCandidateImagePromptPacket.ts`:

- Character instruction (from registry `displayName` + `characterId`)
- `exerciseId`, pose ID, render target, camera view
- Acceptance + negative criteria
- No watermark/logos/text prohibitions
- Single still image language (no video/animate)

**Gap:** Prompt should explicitly say **"Use Google Flow character: Oli Male Trainer"** once mapping field exists.

### Naming & placement

From `buildExpectedKeyframeImportPaths.ts`:

```
Repo:     apps/professional/public/media/exercises/{exerciseId}/keyframes/{poseSlug}-{renderTargetSlug}.png
Public:   /media/exercises/{exerciseId}/keyframes/{poseSlug}-{renderTargetSlug}.png
poseSlug: poseId with underscores → hyphens (e.g. start_lockout → start-lockout)
target:   16:9 → 16x9
```

### What must never happen automatically

- Import → `approved-master` (blocked in `buildCandidateImageImportManifest.ts`)
- File presence alone → approved display (thumbnail resolver checks pack + files)
- Missing QA → `approvalEligible: true` (import sets `approvalEligible: false`)
- Professional upload → canonical library (policy — not implemented)

---

## 5. File Path / Naming Standard

### Recommended standard (align with existing code)

**Primary (keep):**
```
apps/professional/public/media/exercises/{exerciseId}/keyframes/{poseSlug}-{renderTargetSlug}.png
```

**Optional future cover alias (Media-I2+):**
```
apps/professional/public/media/exercises/{exerciseId}/cover/cover-16x9.png
→ symlink or copy of approved thumbnail keyframe; not a second source of truth
```

### Collision avoidance

- `exerciseId` is canonical snake_case from `EXERCISE_LIBRARY_V1`
- `poseId` is spec-scoped per exercise (Bench Press uses `start_lockout`; enrichment-generated specs may use `start`)
- `productionPacketId` and `candidateId` include exercise + pose + render target + view

### Per-exercise README

**Keep** — `bench_press/README.md` documents video + keyframe contract. Template for new exercises.

### Metadata beside images

**Do not** rely on sidecar JSON on disk. Repo uses **code manifests**:

- `benchPressKeyframeImportManifest.v1.ts` — file presence
- Candidate records — full QA/rights/prompt lineage

---

## 6. Top 25 / Top 50 Production Plan

### Top 25 exerciseIds (enrichment order)

From `top25ExerciseEnrichmentEntries.ts`:

1. `bench_press`  
2. `squat`  
3. `deadlift`  
4. `overhead_press`  
5. `barbell_row`  
6. `pull_up`  
7. `romanian_deadlift`  
8. `hip_thrust`  
9. `incline_bench_press`  
10. `lat_pulldown`  
11. `leg_press`  
12. `dumbbell_bench_press`  
13. `seated_cable_row`  
14. `front_squat`  
15. `push_up`  
16. `dumbbell_shoulder_press`  
17. `dumbbell_row`  
18. `split_squat_dumbbell`  
19. `bulgarian_split_squat_dumbbell`  
20. `leg_curl`  
21. `leg_extension`  
22. `calf_raise`  
23. `face_pull`  
24. `lateral_raise`  
25. `rear_delt_fly`

### Top 50 exerciseIds

Ranks 1–50 in `TOP50_EXERCISE_PRIORITY_PLAN_V1` — ranks 26–50 add:  
`hack_squat`, `tricep_pushdown`, `bicep_curl`, `dip`, `skull_crusher`, `plank`, `pallof_press`, `barbell_lunge`, `bodyweight_glute_bridge`, `dumbbell_farmer_carry`, `hanging_leg_raise`, `dead_bug`, `push_press`, `sumo_deadlift`, `close_grip_bench_press`, `hammer_curl`, `pendlay_row`, `good_morning`, `dumbbell_step_up`, `reverse_lunge_barbell`, `dumbbell_incline_bench_press`, `band_monster_walk`, `band_anti_rotation_hold`, `burpee`, `rower`.

### What exists per exercise today

| Capability | bench_press | Top 25 others | Top 50 ranks 26–50 |
| --- | --- | --- | --- |
| Enrichment | ✅ authoritative | ✅ generated | ❌ |
| Keyframe spec | ✅ M9 authoritative | ✅ from enrichment | ❌ |
| Prompt packets | ✅ (blocked) | ✅ (blocked) | ❌ |
| Import manifest | ✅ | ❌ generic builder only | ❌ |
| Image pack builder | ✅ | ❌ | ❌ |
| PNG files | ❌ | ❌ | ❌ |
| Expert review | `not-started` | `not-started` | N/A |

### Minimum viable image per exercise

| Tier | Minimum | Target |
| --- | --- | --- |
| **MVP library card** | 1× approved 16:9 keyframe (cover pose) | `start` or `setup` |
| **MVP coaching** | 4× approved 16:9 keyframes | All required poses |
| **Full spec** | 4 poses × 3 render targets | 12 images (Bench Press model) |

### Recommended batch order

| Batch | Exercises | Images | Goal |
| --- | --- | --- | --- |
| **Batch 0** | Expert review gate | 0 | Approve `bench_press` enrichment checklist first |
| **Batch 1** | `bench_press` | 4× 16:9 keyframes | Prove import → QA → pack → thumbnail |
| **Batch 2** | `squat`, `deadlift`, `overhead_press`, `barbell_row`, `pull_up` | 5× cover 16:9 | Top 5 library visibility |
| **Batch 3** | Top 25 | 25× cover 16:9 | Full library card coverage for enriched set |
| **Batch 4** | Top 25 | ~100× 16:9 keyframes (4 per exercise) | Full coaching packs at master aspect |
| **Batch 5** | Top 50 ranks 26–50 | 25× cover | Needs new enrichment + specs first |

**Optimal Google Flow batch size:** 4–8 images per session (one exercise) — review between exercises.

---

## 7. QA Standard

### Existing coverage

| Area | Repo evidence |
| --- | --- |
| QA dimensions (11) | `CANDIDATE_QA_DIMENSION_IDS` in `candidate-review/types.ts` |
| Scoring | `buildCandidateQaScore.ts` — `APPROVED_MASTER_MINIMUM_SCORE = 90` |
| Human worksheet | `buildCandidateImageQaWorksheet.ts`, `buildBenchPressKeyframeCandidateQaWorksheet.ts` |
| Readiness labels | `buildCandidateImageQaReadiness.ts` — `needs-human-review` default |
| Status transitions | `candidateReviewStatusTransitions.ts` — gates `approved-master` |
| Authoritative checklists | Bench Press keyframe + image pack QA standards |

### QA checklist domains (official images)

| Domain | Requirement |
| --- | --- |
| **Identity** | Oli Male Trainer / `oli_motion_male_m1`; consistent wardrobe; no logos/text |
| **Exercise accuracy** | Correct exercise, pose, equipment, setup, ROM |
| **Biomechanics** | Realistic anatomy; hands/joints; bar path; safe positions |
| **Visual** | Premium dark Oli studio; lighting; equipment visible; no watermark/captions |
| **Rights** | Oli-created; `cleared-for-oli-master`; commercial + client playback |

### Gaps

- No centralized **defect taxonomy** file (worksheet items are inline)
- No **revision request** builder (status `needs-revision` exists; no dedicated revision packet)
- **Cross-exercise** QA worksheet templates beyond generic + Bench Press
- **Operator sign-off** provenance (reviewer ID, session) — partial via `qa.reviewedBy`

---

## 8. Thumbnail Resolver Plan

### Current fallback order (`resolveExerciseThumbnail.ts`)

1. **Approved-master image** — `bench_press` only; requires approved pack frame + file presence
2. **Imported keyframe candidate** — `bench_press` only; `imported-keyframe-candidate`; label `"Dev preview"`
3. **Muscle-equipment placeholder** — if primary muscle or equipment metadata exists
4. **Media placeholder** — `"Image pending"`

### Policy assessment

| Question | Answer |
| --- | --- |
| Checks approved image pack? | ✅ Yes — via `buildBenchPressImagePack` / override |
| Checks imported dev-test files? | ✅ Yes — but **only `bench_press`** |
| Avoids fake approved media? | ✅ Yes — `fileExists: false` → placeholder; tests enforce |
| Library card source once official images exist? | Approved-master 16:9 cover pose |
| Dev-test in normal pro UI? | **⚠️ Risk** — resolver returns dev-test images if files exist; library uses `hideStatusBadge` but **still renders image** |
| Approved-master in normal pro UI? | ✅ Intended path |
| Missing images → placeholder? | ✅ Yes |

### Future utility changes (do not implement in this audit)

| Change | File |
| --- | --- |
| Generalize resolver beyond `bench_press` | `resolveExerciseThumbnail.ts` |
| Add `getApprovedMasterImagePackForExercise(exerciseId)` | new image-pack registry |
| **Dev-gate dev-test thumbnails** — only show in Media Factory / dev mode | `resolveExerciseThumbnail.ts` + env flag |
| Cover pose selection per exercise | image pack `thumbnailFrameId` |
| Wire file presence from per-exercise manifest registry | replace hard-coded `benchPressKeyframeImportManifest.v1.ts` |

### UI surfaces

| Surface | Component | Current behavior |
| --- | --- | --- |
| Exercise library card | `WorkoutLibraryPanel` + `libraryCard` size | Placeholder for most; `hideStatusBadge` |
| Builder exercise row | `WorkoutExercisePrescriptionRow` | `builder` size thumbnail |
| Client preview | Future | Should use approved-master only |
| Exercise Media tab | `ExerciseMediaTab` | Full factory panels |
| Mobile app | Not wired | Share resolver via shared package later |

---

## 9. Professional Custom Image Policy

### Recommendations

| Question | Answer |
| --- | --- |
| Should professionals add custom images now? | **No** |
| Can custom images become official? | **Only via Oli review** — never automatic |
| Custom image scope | Client-specific / coach-library / local draft |
| Status | `draft` or `dev-test`; `sourceOwnership: third-party` or `coach-custom` (type gap) |
| Promotion process | Separate Oli media ops review; never merges into `EXERCISE_LIBRARY_V1` media |
| Backend needed later | Firebase Storage + Firestore metadata + tenant scoping — **not now** |
| Build now? | **No upload UI in Workout Studio** |

### Separation rule

```
Oli Master Image (canonical)     ≠     Professional Custom Image (contextual)
         ↓                                        ↓
approved-master image pack              client/workout-scoped attachment
         ↓                                        ↓
resolveExerciseThumbnail (default)      explicit override on workout card only
```

---

## 10. Data Model / Type Gaps

| Gap | Status | Recommended addition | Backend now? |
| --- | --- | --- | --- |
| `externalToolCharacterName` on character | **Missing** | `OliMotionCharacter.externalToolCharacterNames: { googleFlow: "Oli Male Trainer" }` | No |
| Cover image / thumbnail frame pointer | **Partial** | `ImagePackCoverageLevel` has `thumbnail`; no `coverPoseId` | No |
| Production batch types | **Partial** | `OfficialImageProductionBatch` with batchId, exerciseIds, status | No |
| Image production status per exercise | **Partial** | readiness reports exist; no per-exercise dashboard type | No |
| Import batch metadata | **Exists** | `CandidateImageImportManifest` | No |
| Rights packet improvements | **Exists** | `CandidateRightsPacket` — add `googleFlowSessionId?` | No |
| Review provenance | **Partial** | `qa.reviewedBy` — add `reviewSessionId` | No |
| Prompt version tracking | **Exists** | `promptVersion: google-flow-prompt-packet-v1` | No |
| Google Flow project/session IDs | **Missing** | optional on `CandidateSourceMetadata` | No |
| Coach-custom candidate source | **Missing** | `CandidateSourceOwnership: "coach-custom"` | No |
| Generic per-exercise import manifest | **Partial** | `buildCandidateImageImportManifest` — Bench Press only has static presence map | No |
| Top 50 enrichment + specs | **Missing** | extend `top25ExerciseEnrichmentEntries` pattern | No |

---

## 11. UI / Internal Workflow Gaps

| Question | Answer |
| --- | --- |
| Where can pro see missing images? | Placeholder in library/builder — no explicit "missing" indicator |
| Where can Oli team see production status? | Exercise Media tab panels (Experience Studio only) |
| Pipeline visible in normal pro UI? | **No** — correct |
| Should production UI be dev/internal? | **Yes** — keep in Media tab + future internal route |
| Official Image Production panel location | Extend `ExerciseMediaTab` or add `/studio/media` internal route |
| Library show placeholders until images exist? | **Yes** — current behavior |
| Internal import workflow? | `BenchPressKeyframeCandidateImportPanel` — Bench Press only |
| "Add image" in normal builder? | **No** |
| Media Factory for internal team? | **Yes** — current direction is correct |

### Likely UX-4 alignment

Sprint UX-4 (Advanced Exercise Modal + Media Factory Dev Gating) should **gate** Media Factory panels behind dev flag — audit confirms they are already nested in Experience Studio, not in library.

---

## 12. Implementation Roadmap

| Sprint | Name | Objective | Key files |
| --- | --- | --- | --- |
| **Media-I1** | **This audit** | Decision doc | `docs/audits/official-oli-exercise-image-production-audit.md` |
| **Media-I2** | Character mapping + cover types | `externalToolCharacterName`; `thumbnailFrameId`; prompt uses "Oli Male Trainer" | `character-registry/types.ts`, `oliCharacterRegistry.ts`, `buildCandidateImagePromptPacket.ts` |
| **Media-I3** | Bench Press import v1 | 4 real PNGs; update `BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1`; dev-test candidates | `public/media/exercises/bench_press/keyframes/*.png`, manifest data, import builders |
| **Media-I4** | Bench Press human QA | Complete worksheets; manual `approved-master` promotion | `buildBenchPressKeyframeCandidateQaWorksheet.ts`, review state |
| **Media-I5** | Bench Press approved pack + thumbnail | `BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES` populated; resolver shows approved in pro UI | `image-pack/data/`, `resolveExerciseThumbnail.ts` |
| **Media-I6** | Top 5 cover images | 5 exercises × 1× 16:9; generic manifest registry | new per-exercise manifest pattern |
| **Media-I7** | Top 25 cover images | 25 library thumbnails | scale I6 |
| **Media-I8** | Top 25 full 16:9 packs | 4 keyframes × 25 exercises | production queue batches |

### What not to build yet

- Google Flow API integration
- Firebase Storage / Firestore media persistence
- Professional upload in Workout Library
- Auto-approve on import
- Full 300-packet generation before Bench Press loop proof
- Cover folder duplication before cover pose alias is defined
- Top 50 specs before Top 25 images ship

---

## 13. Risk Register

| ID | Severity | Evidence | Why it matters | Recommendation | Tests | Backend now? |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | **P0** | `resolveExerciseThumbnail` dev-test path | Dev images could appear in pro library if files added | Dev-gate dev-test thumbnails in normal UI | `exerciseThumbnailResolver.test.ts` | No |
| R2 | **P0** | No PNG files; empty `BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES` | False sense of readiness if metadata says approved | Keep `fileExists: false` until real files committed | import manifest tests | No |
| R3 | **P0** | Expert review `not-started` for all 25 | Generating before review risks incorrect poses | Complete `bench_press` expert review first | `top25CandidateImageProductionPackets.test.ts` | No |
| R4 | **P0** | No `externalToolCharacterName` | Operator may pick wrong Flow character | Add mapping in Media-I2 | character registry tests | No |
| R5 | **P0** | Thumbnail resolver `bench_press`-only | Top 25 images won't display after import | Generalize resolver in Media-I5/I6 | thumbnail tests | No |
| R6 | **P1** | 300 packets for Top 25 | Production overwhelm | Cover-first rollout | queue tests | No |
| R7 | **P1** | Enrichment-generated specs ≠ M9 authoritative | Lower QA bar for non–Bench Press | Expert review per exercise | keyframe spec tests | No |
| R8 | **P1** | Import manifest bench_press-specific | Manual presence maps per exercise | Generic registry + codegen | import manifest tests | No |
| R9 | **P1** | Media panels in Experience Studio | Discoverability for ops team | Internal media route or dev flag | panel tests | No |
| R10 | **P2** | 3 render targets per pose | 3× generation cost | Start 16:9 only | packet tests | No |
| R11 | **P2** | `hideStatusBadge` on library | Hides dev label but not image | Policy: approved-only in library | library panel tests | No |
| R12 | **P3** | Video README conflates keyframes + video | Operator confusion | Keep README sections separate | docs | No |

---

## 14. Final Recommendation

### Exact next sprint: **Media-I2 — Character Mapping + Cover Image Type Additions**

**Objective:** Close the Google Flow operator gap and define library thumbnail frame selection — **no media files, no backend**.

**Files likely to create/modify:**

- `apps/professional/src/features/exercise-media-os/character-registry/types.ts`
- `apps/professional/src/features/exercise-media-os/character-registry/oliCharacterRegistry.ts`
- `apps/professional/src/features/exercise-media-os/candidate-production/buildCandidateImagePromptPacket.ts`
- `apps/professional/src/features/exercise-media-os/image-pack/types.ts`
- `apps/professional/src/features/exercise-media-os/character-registry/__tests__/oliCharacterRegistry.test.ts`
- `apps/professional/src/features/exercise-media-os/candidate-production/__tests__/candidateImagePromptPacket.test.ts` (if exists)

**Tests to add:**

- `oli_motion_male_m1` maps to `externalToolCharacterName: "Oli Male Trainer"`
- Prompt packet `fullPromptText` includes Google Flow character name
- Image pack type includes optional `thumbnailFrameId` / cover pose

**Acceptance criteria:**

1. Character registry documents Google Flow name without changing `characterId`
2. Prompt packets reference "Oli Male Trainer" for operators
3. Cover/thumbnail pose type defined for image packs
4. No PNG files added
5. No `approved-master` status changes
6. Professional typecheck/lint/test pass

**Immediately after Media-I2:** **Media-I3 — Bench Press Official Image Import v1** — user generates 4 PNGs in Google Flow, places in repo, updates file presence, runs human QA.

---

## Appendix A — Audit Section answers (quick reference)

### A. Pipeline map answers

1. Character Registry: `character-registry/oliCharacterRegistry.ts`, `types.ts`
2. Character IDs: `oli_motion_male_m1`, `oli_motion_female_f1`
3. "Oli Male Trainer" mapping: **No** — use `displayName: "Oli Motion Male M1"`
4. Recommended: add `externalToolCharacterName: "Oli Male Trainer"` on `oli_motion_male_m1`
5. Keyframe specs: `keyframe-spec/*`, Top 25 registry
6. Prompt packets: `candidate-production/buildCandidateImagePromptPacket.ts`
7. Import manifests: `benchPressKeyframeImportManifest.v1.ts`, `buildCandidateImageImportManifest.ts`
8. Candidates: `candidate-review/types.ts`, `buildMediaCandidateFromImageImport.ts`
9. Human QA: `buildCandidateImageQaWorksheet.ts`, `buildBenchPressKeyframeCandidateQaWorksheet.ts`
10. Image packs: `image-pack/buildApprovedMasterImagePack.ts`
11. Thumbnail resolver: `resolveExerciseThumbnail.ts`
12. Public folders: `apps/professional/public/media/exercises/bench_press/` only
13. PNG/JPG/WebP files: **0**

---

*End of audit — implementation intentionally deferred.*
