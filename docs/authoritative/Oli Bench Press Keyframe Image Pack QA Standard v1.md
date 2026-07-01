# Oli Bench Press Keyframe Image Pack QA Standard v1

**Status:** Authoritative for Bench Press keyframe image pack production and QA  
**Version:** keyframe-image-pack-qa-v1  
**Applies to:** `bench_press` keyframe image pack and approved master image frames

---

## Purpose

Define the exact quality bar for Bench Press setup/start/bottom/finish keyframes before they can become an **Oli Approved Master Image Pack**.

This standard governs keyframe image production and expert QA review before any frame is labeled approved master or assembled into a pack.

This document does **not** describe backend upload, CDN delivery, or client publishing flows.

---

## Definitions

### Keyframe candidate

A single still image representing one required bench press pose at a specific render target (e.g. 16:9 master). Keyframe candidates enter the M10 Candidate Review workflow.

### Dev-test candidate

A locally produced keyframe image used to test framing, character consistency, or review UI. Dev-test candidates **must not** count toward approved master image pack approval.

### Approved master keyframe

A keyframe candidate with status `approved-master` that passes **all** criteria in this document, M10 QA scoring, rights clearance, and hard gates. Requires human QA sign-off recorded in reviewer notes.

### Approved master image pack

An assembled set of approved master keyframes covering every required pose for the exercise keyframe spec at the requested render targets. Pack status `approved-master` requires full pose coverage, rights cleared, zero hard-gate failures, and minimum QA score ≥ 90.

---

## Required global criteria

Every Bench Press keyframe candidate must satisfy **all** of the following:

- **Canonical exerciseId:** `bench_press` (exact — no aliases)
- **Character:** `oli_motion_male_m1` unless explicitly superseded by product authority
- **Consistent character identity** across all four frames
- **Consistent bench, barbell, plates, and environment** across all four frames
- **Premium dark Oli studio** aesthetic — cinematic, clean, professional
- **Full bench, barbell, plates, and feet visible** in 16:9 master view
- **Realistic human anatomy** — no impossible joint positions
- **Realistic barbell geometry** — straight rigid bar, symmetric plates
- **No watermark**
- **No logos**
- **No readable text** on clothing, equipment, or background
- **Clear on mobile** — readable on phone-sized screens
- **No distorted hands**
- **No warped barbell**
- **No impossible anatomy**

---

## Pose-specific criteria

### setup

- Athlete lying on bench
- Eyes under or slightly behind bar
- Hands set evenly on the bar
- Feet planted on floor
- Upper back tight (scapular retraction visible)
- Glutes on bench

### start_lockout

- Bar held above chest/shoulder line
- Elbows locked or nearly locked
- Wrists stacked over forearms
- Shoulder blades retracted and depressed
- Stable torso — rep about to begin

### bottom_chest_pause

- Bar lightly touches lower chest/sternum
- Paused position is clear — no hover above chest
- Wrists stacked
- Elbows moderate — not extreme flare
- Feet planted
- **No bounce**
- Bar does not hover above chest

### finish_lockout

- Bar returned to full lockout above chest/shoulder line
- **No second descent implied**
- Stable bar path at finish
- Controlled finish — end of single rep
- Same camera, character, and equipment continuity as prior frames

---

## Render targets

| Target | Purpose |
|--------|---------|
| 16:9 | Desktop / master review |
| 9:16 | Mobile portrait-safe crop |
| 1:1 | Thumbnail / future preview tile |

Minimum approved master pack for Sprint M11 pilot: **16:9** coverage for all four required poses.

---

## Approval

A keyframe may **not** be approved master unless it:

1. Passes M10 candidate QA scoring (approval eligible)
2. Passes all M10 hard gates (no watermark, logos, readable text, rights, anatomy, equipment)
3. Has rights `cleared-for-oli-master`
4. Has `localAsset.existsInRepo: true` when used in live production data
5. Has human QA approval recorded in reviewer notes

An image pack may **not** reach status `approved-master` unless every required pose has an approved master keyframe at each required render target.

**Dev-test candidates do not count.**  
**Video candidates do not satisfy image pack requirements.**

---

## Related documents

- Oli Bench Press Hero Demo QA Standard v1
- Exercise Media OS Candidate Review (Sprint M10)
- Bench Press Keyframe Spec (Sprint M9)
