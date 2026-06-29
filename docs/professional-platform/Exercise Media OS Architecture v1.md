# Exercise Media OS Architecture v1

Exercise Media OS defines how Oli ships a **world-class out-of-the-box media experience** for every exercise — while letting professionals customize delivery without becoming content creators.

## Philosophy

Professionals should not be required to film, edit, or upload videos to deliver excellent coaching.

Oli provides:

- Master media packages per exercise
- Demonstrations, setup, execution, slow motion, overlays
- Narration, captions, and common-mistake clips
- Mobile-optimized playback architecture (future)

Professionals customize:

- Today's focus
- Teaching style and difficulty
- Visual emphasis
- Coach message and client-specific priority

## Layering

| Layer | Location | Role |
| --- | --- | --- |
| Canonical library | `lib/workouts/exercises/library.v1.ts` | Exercise identity source of truth |
| Exercise Academy | `apps/professional/src/features/exercise-academy/` | Teaching foundation + legacy media plan slots |
| **Exercise Media OS** | `apps/professional/src/features/exercise-media-os/` | Blueprint, master package, composer, client timeline |
| Workout card composer | Workout Studio Media tab | Session/client media experience customization |

Media OS **does not duplicate** the exercise catalog. It keys all artifacts by canonical `exerciseId`.

## Core models (Sprint M1)

### ExerciseMediaBlueprint (`blueprint-v1`)

Defines required and optional media slots, personalization options, and client experience phases for an exercise.

Required slots: hero demo, setup, execution, common mistake, coach intro.

Optional slots: slow motion, muscle/joint overlays, angles, coach note, reflection.

### MasterMediaPackage (`master-v1` / pilot)

Planned Oli-owned media package — most exercises start as `planned` in Sprint M1. No asset URLs yet.

**Sprint M4 pilot:** `bench_press` ships a local complete pilot package (`master-v1-bench-press-pilot`) with approved placeholder slots — cinematic video surfaces, narration cards, and anatomy overlays. Other canonical exercises remain planned.

Includes teaching styles, difficulty levels, visual emphasis options, estimated duration, and quality score.

### MediaComposerState

Professional customization overlay:

- Teaching style (simple, technical, scientific, athletic, motivational, rehab-aware)
- Difficulty level
- Today's focus + visual emphasis
- Coach message
- Enabled slots
- Client experience mode

Stored on the workout exercise card (`mediaComposer`).

### ClientMediaTimeline

Deterministic ordered preview of what the client would experience:

1. Coach Intro → Hero Demo → Setup → Execution → Common Mistake → Slow Motion → Muscle Overlay → Reflection

Timeline items reference `oli-master` source unless coach intro/note has a coach message (`coach-custom`).

### MediaReadinessScore

Production readiness indicator — planned slots are not "complete" but show future readiness path.

## Workout Studio integration

Media tab (`ExerciseMediaTab`) shows:

1. **Master Media Package** — status, duration, readiness, slot list, Oli Master badge
2. **Customize Experience** — composer controls
3. **Client Media Timeline** — ordered preview with duration, source, purpose

Future actions (disabled in M1): AI enhancement, upload, record, publish.

## Payload mapping

`buildAppWorkoutDraftPayload()` includes compact `mediaExperience` per exercise:

- Blueprint and package versions
- Selected teaching style, difficulty, focus, emphasis
- `hasCoachMessage`, timeline item count, estimated duration

No large text or video URLs in the preliminary payload.

## Future phases

1. **Real assets** — fill master packages using the Exercise Product pipeline (Bench Press reference)
2. **AI generation** — execute production brief prompts with expert QA gate
3. **Storage / CDN** — upload and delivery infrastructure
4. **Mobile playback** — consume timeline + master package in consumer app
5. **Review / approval workflow** — slot status progression to `approved`

## Sprint M5 — Bench Press Exercise Product Pipeline

`bench_press` is the first fully structured **Exercise Product** in Oli. Internal production is now explicit code:

| Artifact | Version | Location |
| --- | --- | --- |
| Media Storyboard | `storyboard-v1` | `bench-press-product/buildBenchPressMediaStoryboard.ts` |
| Production Brief | `brief-v1` | `bench-press-product/buildBenchPressProductionBrief.ts` |
| Expert QA Checklist | `qa-v1` | `bench-press-product/buildBenchPressExpertMediaQAChecklist.ts` |
| Full pipeline | `bench-press-product-v1` | `bench-press-product/buildBenchPressExerciseProductPipeline.ts` |

The Workout Studio Media tab shows a **Production Pipeline** section (collapsed by default) for Bench Press only. Per-scene **View Brief** exposes narration, shot list, overlays, AI prompts, biomechanics constraints, and QA checks.

Payload adds compact product refs — not the full brief body.

See: `docs/professional-platform/Bench Press Master Exercise Product v1.md`

## Sprint M6 — Lesson Playback Prototype

`bench_press` ships a **storyboard-driven lesson playback prototype** — a polished client lesson preview without real video assets.

| Component | Location |
| --- | --- |
| Playback domain | `playback/` — plan, scene, progress utilities |
| Bench Press plan builder | `playback/buildLessonPlaybackPlan.ts` |
| Lesson player UI | `components/workout-studio/media-playback/` |

The playback plan consumes:
- Exercise Product Pipeline (storyboard + production brief)
- Master Media Package slot metadata
- Media Composer state (goal, style, difficulty, coach message)

Workout Studio opens a full-screen **Lesson Playback Modal** from the Media tab or live preview play button. Placeholder cinematic surfaces stand in for future AI-generated or filmed assets.

No real videos, uploads, Storage, or backend changes.

**Sprint M7:** Asset-backed playback — approved local video files play via HTML `<video>`; missing assets fall back to storyboard placeholders. Manifest: `data/benchPressMediaAssets.ts`. Public path: `public/media/exercises/bench_press/`.

See: `docs/professional-platform/Bench Press Master Exercise Product v1.md`

## Sprint M1 limitations

- No backend, Firestore, or Storage changes
- No real video playback or upload
- No AI generation execution
- Most master packages are planned placeholders — **except `bench_press` pilot (M4)**
- Professional app does not import React Native UI

## Sprint M4 — Bench Press pilot

`bench_press` includes a local high-fidelity **Master Media Package pilot** (`apps/professional/src/features/exercise-media-os/data/benchPressMasterMediaPackage.ts`):

- Eight approved placeholder slots (coach intro through reflection)
- Rich UI metadata: visual treatment, asset kind, client/professional purpose, placeholder visual labels
- No real URLs, CDN, or uploads — models future production packages
- Other exercises remain `planned` until Top 10 / Top 20 rollout

Next step: expand pilot pattern to additional canonical exercises using the Bench Press Exercise Product pipeline as the reference standard.

See also: `docs/professional-platform/Bench Press Master Exercise Product v1.md`, `apps/professional/README.md`, `Exercise Academy Architecture v1.md`
