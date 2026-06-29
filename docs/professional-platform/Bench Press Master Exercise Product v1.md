# Bench Press Master Exercise Product v1

Bench Press is the **reference standard** for Oli Exercise Academy media products. Sprint M5 makes the internal production chain explicit and reusable for future exercises.

## Purpose

Deliver a world-class bench press lesson **without requiring professionals to film or upload**. Oli owns the master media product; professionals customize delivery (focus, style, coach message) through the Media Composer.

## No-filming philosophy

Professionals should not become content creators. Oli provides:

- Academy teaching knowledge
- Intelligence overlay (muscles, joints, programming)
- Master media package with approved placeholder slots
- Client lesson timeline preview

The Production Pipeline is **internal/advanced visibility** — storyboard, AI-ready brief, and expert QA — not the everyday pro-facing surface.

## Product chain

```
Exercise Academy knowledge
  → Media Storyboard
  → AI-ready Production Brief
  → Client Lesson Timeline
  → Expert QA Checklist
  → Future generated / real assets
```

| Stage | Location | Output |
| --- | --- | --- |
| Academy | `exercise-academy/` | Teaching foundation for `bench_press` |
| Intelligence | `top20ExerciseAcademyIntelligence.ts` | Muscles, movement analysis, coaching notes |
| Storyboard | `bench-press-product/buildBenchPressMediaStoryboard.ts` | 8 ordered scenes with learning objectives |
| Production Brief | `bench-press-product/buildBenchPressProductionBrief.ts` | Narration, shots, overlays, AI prompts |
| Client Timeline | `buildClientMediaTimeline.ts` | Ordered client preview |
| Expert QA | `bench-press-product/buildBenchPressExpertMediaQAChecklist.ts` | Scene + package checks |
| Assets | `benchPressMasterMediaPackage.ts` | Placeholder-only (M4 pilot) |

## Scene list

Order matches the master media package and client timeline:

1. **coachIntro** — Session intent and confidence
2. **heroDemo** — Full-speed demonstration (chest, triceps, shoulders; horizontal push)
3. **setup** — Bar path, shoulder blade retraction, foot drive
4. **execution** — Controlled reps, breathing, tempo
5. **commonMistake** — Bouncing, elbow flare, unstable wrists
6. **slowMotion** — Joint path and bar path at reduced speed
7. **muscleOverlay** — Primary/secondary muscle highlights
8. **reflection** — Client takeaway and set logging prep

## Production brief standard

Each scene brief includes:

- **Narration script** — Short, client-facing voiceover
- **On-screen text** — Apple-style teaching copy
- **Shot list** — Camera angle, framing, movement, duration
- **Overlay plan** — Muscle highlights, bar path, tempo, callouts
- **Camera direction** — Premium cinematic dark gym, clean background
- **AI generation prompt** — Model-agnostic (Veo / Runway / Sora-style)
- **Negative prompt** — Unsafe form, distorted anatomy, messy background
- **Biomechanics constraints** — Critical guardrails for movement scenes
- **Acceptance criteria** — Scene-specific QA requirements

No AI calls are made in M5 — the brief is production-ready documentation only.

## AI prompt strategy

Prompts are deterministic, exercise-specific, and model-agnostic:

- Describe subject, environment, camera, and movement quality
- Reference Academy/Intelligence teaching beats
- Shared negative prompt blocks unsafe bench press form and visual artifacts

Future phases will feed these prompts to video generation tools with human expert review.

## Biomechanics guardrails

Critical constraints apply to **setup**, **heroDemo**, **execution**, **commonMistake**, and **slowMotion**:

- Shoulder blade stability and bar path
- Elbow angle and wrist stacking
- No bouncing or exaggerated lumbar arch
- Controlled eccentric and concentric tempo

Constraints include `failureMode` and `severity: "critical" | "warning"` for QA review.

## QA checklist

Expert QA includes per-scene checks (movement accuracy, safety, teaching clarity, visual/audio quality, overlays, accessibility, client comprehension) and package-level checks (all scenes present, duration, Academy/Intelligence alignment, captions, professional approval).

Default status: **not-reviewed**. Approval gate cannot pass until all required checks are marked pass.

## Workout Studio UI

On the Bench Press Media tab only:

- **Production Pipeline** — Collapsed by default; summary shows Storyboard / Brief / QA / Assets status
- **Per-scene View Brief** — Inline panel with full production details
- **Preview Bench Press Lesson** — Opens storyboard-driven lesson playback modal (M6)

Everyday Media experience remains primary: Today's Goal, coach message, client preview, lesson narrative.

## Lesson Playback Prototype (M6)

The client lesson preview is driven by:

```
Storyboard + Production Brief + Media Package + Composer → LessonPlaybackPlan → Lesson Player UI
```

Each of the 8 scenes renders:
- Cinematic placeholder visual surface
- Narration script and on-screen teaching text
- Client purpose and duration
- Play/progress controls and scene navigation

Status language is honest:
- **Blueprint Complete** — product pipeline and storyboard ready
- **Preview Available** — interactive lesson playback prototype
- **Assets Pending Production** — no real video yet

When the professional adds a coach message, the Coach Intro scene source becomes `coach-custom` and the message appears in playback.

Future phases replace placeholder surfaces with real master assets without changing the playback plan contract.

## Payload compatibility

`buildMediaExperiencePayloadRef` adds compact refs for `bench_press` only:

- `exerciseProductVersion`: `bench-press-product-v1`
- `productionBriefVersion`: `brief-v1`
- `qaVersion`: `qa-v1`
- `assetStatus`: `placeholder-only`

No storyboard or brief body in the workout draft payload.

## Current limitations (M5–M7)

- No real video generation or external AI API calls
- No uploads, Storage, CDN, or backend persistence
- No Firestore writes or mobile playback
- No publishing / assignment workflow
- **M7:** Local media asset manifest exists; default status is `missing` — storyboard placeholders play until approved files are added locally
- Pipeline isolated to Bench Press — not generalized yet

## Asset-backed playback (M7)

Media assets are defined in `benchPressMediaAssets.ts` with optional local paths under `public/media/exercises/bench_press/`.

When a scene has an **approved** video asset with a path, `LessonPlaybackPlayer` renders an HTML `<video>` element. Missing files or non-approved assets fall back to storyboard placeholders without errors.

See: `apps/professional/public/media/exercises/bench_press/README.md`

## Future path

1. Fill master package slots with generated or filmed assets
2. Run AI generation using production brief prompts + expert QA gate
3. Expand pipeline pattern to Top 10 / Top 20 exercises after Bench Press validation
4. Connect approved assets to mobile playback and assignment flows

See also: `Exercise Media OS Architecture v1.md`, `Exercise Academy Architecture v1.md`, `apps/professional/README.md`
