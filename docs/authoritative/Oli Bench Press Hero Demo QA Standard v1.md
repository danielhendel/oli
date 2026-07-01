# Oli Bench Press Hero Demo QA Standard v1

**Status:** Authoritative for Bench Press Hero Demo production and QA  
**Version:** hero-demo-qa-v1  
**Applies to:** `bench_press` hero demo slot and related keyframe image pack production

---

## Purpose

Define the exact quality bar for a Bench Press Hero Demo asset before it can be considered an **Oli Master Asset**.

This standard governs:

- Hero demo video clips (future, from approved keyframes)
- Keyframe image production for the bench press pose set
- Expert QA review before any asset is labeled approved master

This document does **not** describe backend upload, CDN delivery, or client publishing flows.

---

## Definitions

### Dev-test candidate

A locally produced clip or image used to test playback, framing, or generation tooling. A dev-test candidate may help engineering validation but **must not** be labeled an approved master asset unless every criterion in this document passes expert review.

### Needs revision

A candidate that fails one or more required master criteria. It requires re-production or correction before re-review.

### Approved master asset

An asset that passes **all** required master criteria in this document, is tied to the approved character anchor (`oli_motion_male_m1` unless explicitly superseded), and has expert sign-off recorded in the production QA workflow.

---

## Required master asset criteria

A Bench Press Hero Demo approved master asset must satisfy **all** of the following:

### Rep integrity

- Exactly **one full rep** is demonstrated or implied by the pose set.
- **No second rep** and **no half rep**.
- No partial second descent implied at finish lockout.

### Equipment and framing

- **Full bench**, **barbell**, **plates**, and **feet** visible in the master 16:9 review view.
- Stable camera — no shaky or drifting framing.
- Clear bar path readable on desktop and mobile.

### Movement quality

- Bar touches **lower chest / sternum** at the bottom position.
- **Brief pause on chest** — no bounce.
- Smooth, controlled press through the mid-range.
- **Wrists stacked** over elbows.
- **Elbows moderate** — not extreme flare.
- **Feet planted** throughout the rep.

### Visual and anatomical quality

- **Realistic human anatomy** — no impossible joint positions.
- **Realistic barbell physics** — straight rigid bar, symmetric plates.
- **No warped barbell**.
- **No distorted hands** or fingers.
- **Premium Oli visual style** — dark, clean, cinematic studio aesthetic.
- **Clear on mobile** — readable on phone-sized screens.

### Brand and rights safety

- **No watermark**.
- **No visible logos** on wardrobe or equipment.
- **No readable text** on clothing, equipment, or background (AI generation distorts text).

---

## Dev-test allowance

A clip or image may be used locally as a **dev-test candidate** if it helps test:

- Lesson playback wiring
- Framing and crop checks
- External generation tool evaluation

Dev-test candidates must be clearly distinguished from approved master assets. Dev-test status does **not** satisfy client delivery or master media package completion.

---

## Render targets

Master production must support these render targets:

| Target | Use |
| --- | --- |
| **16:9** | Desktop / master review |
| **9:16** | Mobile portrait-safe delivery |
| **1:1** | Thumbnail, social, and future preview surfaces |

---

## Keyframe pose set alignment

The bench press keyframe spec (`buildBenchPressKeyframeSpec`) must include these poses before hero demo video generation:

1. **setup** — bench, bar, grip, feet, upper-back tightness
2. **start_lockout** — motionless top position before descent
3. **bottom_chest_pause** — bar touching lower chest/sternum with brief pause
4. **finish_lockout** — controlled return to lockout, end of single rep

Hero demo video must not contradict the approved keyframe image pack.

---

## Code references

| Artifact | Location |
| --- | --- |
| Hero demo QA constants | `apps/professional/src/features/exercise-media-os/bench-press-product/benchPressHeroDemoQaStandard.ts` |
| Bench press keyframe spec | `apps/professional/src/features/exercise-media-os/keyframe-spec/buildBenchPressKeyframeSpec.ts` |
| Character anchor | `apps/professional/src/features/exercise-media-os/character-registry/oliCharacterRegistry.ts` |
| Playable asset readiness | `apps/professional/src/features/exercise-media-os/buildMediaAssetReadinessScore.ts` |
| Slot metadata readiness | `apps/professional/src/features/exercise-media-os/buildMediaReadinessScore.ts` |

---

## Relationship to readiness scores

- **Slot metadata readiness** (`buildMediaReadinessScore`) measures blueprint/package planning status.
- **Playable asset readiness** (`buildMediaAssetReadinessScore`) measures whether approved media files exist.

Slot approval alone does **not** mean production is ready for client delivery.

---

## Revision history

| Version | Date | Notes |
| --- | --- | --- |
| v1 | 2026-06-30 | Initial authoritative standard — Sprint M9 |
