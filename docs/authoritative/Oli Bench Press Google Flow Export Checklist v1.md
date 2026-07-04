# Oli Bench Press Google Flow Export Checklist v1

**Status:** Authoritative operator guide for Media-I3 Bench Press keyframe import  
**Version:** bench-press-google-flow-export-checklist-v1  
**Sprint:** Media-I3 — Bench Press Official Image Import v1

---

## Purpose

Manual operator steps to export four Bench Press 16:9 keyframe stills from Google Flow, place them in the Oli repo, and enable the local dev-test import pipeline.

This sprint does **not** approve master images. Imported candidates remain `dev-test` with `internal-dev-only` rights until Media-I4 human QA and Media-I5 approved-master pack work.

---

## Character

| Field | Value |
|-------|-------|
| Google Flow character | **Oli Male Trainer** |
| Internal characterId | `oli_motion_male_m1` |
| Registry | `apps/professional/src/features/exercise-media-os/character-registry/oliCharacterRegistry.ts` |

Prompt packets must include:

- `Use Google Flow character: Oli Male Trainer.`
- `Character registry ID: oli_motion_male_m1.`

---

## Required poses (4)

Generate one PNG per pose using existing Bench Press prompt packets (`google-flow-prompt-packet-v1`).

| keyframePoseId | Filename | Public path |
|----------------|----------|-------------|
| `setup` | `setup-16x9.png` | `/media/exercises/bench_press/keyframes/setup-16x9.png` |
| `start_lockout` | `start-lockout-16x9.png` | `/media/exercises/bench_press/keyframes/start-lockout-16x9.png` |
| `bottom_chest_pause` | `bottom-chest-pause-16x9.png` | `/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png` |
| `finish_lockout` | `finish-lockout-16x9.png` | `/media/exercises/bench_press/keyframes/finish-lockout-16x9.png` |

---

## Exact repo paths

Place exported files here (no subfolders, no random Google Flow filenames):

```
apps/professional/public/media/exercises/bench_press/keyframes/setup-16x9.png
apps/professional/public/media/exercises/bench_press/keyframes/start-lockout-16x9.png
apps/professional/public/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png
apps/professional/public/media/exercises/bench_press/keyframes/finish-lockout-16x9.png
```

---

## Google Flow export settings

- Format: **PNG**
- Output: single still keyframe image (not video)
- Aspect ratio: **16:9**
- Character: **Oli Male Trainer**
- No watermark
- No logos
- No readable text
- Premium dark Oli studio aesthetic
- Realistic anatomy and equipment

---

## Pre-export verification

1. Open Bench Press prompt packets (see `buildCandidateImagePromptPacket` / production packet IDs).
2. Confirm character line references **Oli Male Trainer** and `oli_motion_male_m1`.
3. Confirm pose-specific framing matches the Bench Press keyframe spec (`setup`, `start_lockout`, `bottom_chest_pause`, `finish_lockout`).

---

## Post-export steps

1. **Rename** exports to exact filenames above (kebab-case pose slug + `-16x9.png`).
2. **Copy** into `apps/professional/public/media/exercises/bench_press/keyframes/`.
3. **Verify** files are non-empty PNGs:
   ```bash
   file apps/professional/public/media/exercises/bench_press/keyframes/*.png
   ```
4. **Update** `BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1` in  
   `apps/professional/src/features/exercise-media-os/candidate-production/data/benchPressKeyframeImportManifest.v1.ts`  
   — set `true` only for paths where the file actually exists.
5. **Run checks:**
   ```bash
   npm --workspace @oli/professional run typecheck
   npm --workspace @oli/professional run lint
   npm --workspace @oli/professional run test
   ```
6. **Confirm import manifest:**
   - `importableItemCount` equals number of present PNGs (4 when complete)
   - `buildBenchPressImportedImageCandidates()` creates dev-test candidates only
7. **Run human QA** using:
   - `docs/authoritative/Oli Bench Press Keyframe Candidate Review Checklist v1.md`
   - `docs/authoritative/Oli First Keyframe Candidate Import QA Standard v1.md`

---

## What Media-I3 does NOT do

- Does not create `approved-master` candidates
- Does not approve image packs
- Does not set `thumbnailFrameId` on live pack
- Does not add backend, Firestore, Storage, APIs, or CDN
- Does not call Google Flow APIs (generation is manual/external)

---

## Expected imported candidate IDs (after files present)

When all 4 PNGs exist and presence map is updated:

| Pose | candidateId |
|------|-------------|
| setup | `bench_press_setup_16x9_google_flow_v1_dev_test` |
| start_lockout | `bench_press_start_lockout_16x9_google_flow_v1_dev_test` |
| bottom_chest_pause | `bench_press_bottom_chest_pause_16x9_google_flow_v1_dev_test` |
| finish_lockout | `bench_press_finish_lockout_16x9_google_flow_v1_dev_test` |

All candidates: `status: dev-test`, `rights.usageStatus: internal-dev-only`, QA `approvalEligible: false`.

---

## Next sprint

After 4 PNGs are imported and presence map updated:

**Media-I4 — Bench Press Human QA Review**

If PNGs are still missing:

**Media-I3a — Generate/Place Bench Press PNGs From Google Flow Checklist**
