# Exercise Academy Architecture v1

Exercise Academy turns canonical exercises into **teachable knowledge objects** — not database rows. Each entry is a guided learning experience that powers Workout Studio, future client delivery, cinematic media, coach customization, and AI-assisted coaching.

## Canonical source vs Exercise Academy

| Layer | Role |
| --- | --- |
| `lib/workouts/exercises/library.v1.ts` (`EXERCISE_LIBRARY_V1`) | Single canonical exercise truth: identity, muscles, equipment, movement, cues |
| Exercise Academy (`apps/professional/src/features/exercise-academy/`) | Teaching foundation built from canonical metadata — overview, setup, execution, modules, media plan, quality |
| Academy Intelligence (`intelligence-v1`) | Educational overlay keyed by canonical `exerciseId` — not a duplicate catalog |

Workout Studio **never duplicates** canonical exercise truth. Academy entries and Intelligence overlays are derived deterministically from canonical IDs.

## Exercise Academy Intelligence (Sprint 1.8)

`ExerciseAcademyIntelligenceEntry` (`intelligence-v1`) adds designer-facing decision support:

- **Primary / secondary muscles** — volume attribution in Workout Studio
- **Stabilizers** — qualitative exposure tracking across the workout
- **Joint considerations** — coaching guidance (`stressLevel` + note), not medical diagnosis
- **Movement analysis** — pattern, plane, prime actions, limiting factors, stability demand
- **Programming use cases** — goal, fit, note
- **Fatigue profile** — local/systemic/recovery cost
- **Substitutions / regressions** — coaching decision aids

Top 20 high-value exercises are seeded as **draft / expert-consensus** in `data/top20ExerciseAcademyIntelligence.ts`. Future workflow: review → approved, evidence level upgrades, expand to top 100.

### Volume attribution v1

`buildWorkoutVolumeAttribution()` produces:

- **Primary** — designed sets credited to intelligence primary muscles; fallback to taxonomy primary when intelligence missing
- **Secondary** — designed sets credited to intelligence secondary muscles only
- **Stabilizers / joint stress** — exposure counts with contributing exercises

`buildWorkoutProjectedVolume()` is preserved unchanged for quality checklist and legacy payload fields.

## Exercise Knowledge

An `ExerciseAcademyEntry` (`academy-v1`) includes:

- **Identity** — exerciseId, name, muscles, equipment, movement pattern, skill level
- **Biomechanics** — conservative starter descriptors from movement pattern
- **Teaching** — overview, setup, execution, cues, mistakes, feel guides, breathing/tempo/bracing
- **Programming** — rep ranges, loading patterns, progression/regression options
- **Safety** — scaling notes and stop-if guidance (no medical claims)
- **Substitutions** — placeholder structure for future substitution graph
- **Quality** — deterministic completeness score

Pure functions build entries, lesson modules, media plans, and quality scores.

## Media Assets

Media is **architecture only** in Sprint 1.5 — no uploads, no Firestore writes.

`ExerciseMediaPlan` defines planned slots:

- hero-demo, setup, execution, slow-motion, common-mistake
- front-angle, side-angle, close-up, muscle-overlay
- coach-intro-custom, coach-note-custom

Status progresses: `missing` → `planned` → `partial` → `complete`.

Future mobile bundled media (`lib/workouts/exercises/media/`) remains separate; professional app does not import React Native media pickers.

## Professional Customization

Workout Studio distinguishes two layers:

1. **Exercise Academy** — reusable teaching foundation (read-only preview in Studio today)
2. **Coaching details on the exercise card** — client/session-specific overlays (why today, intent, edited cues)

`createDefaultExerciseDetails()` seeds card coaching fields from Academy content. Professional edits stay local on the workout draft.

## Client Experience

Lesson modules default order:

1. Overview → 2. Setup → 3. Execution → 4. Coaching Cues → 5. Common Mistakes → 6. What You Should Feel → 7. Progression → 8. Reflection

Future app delivery will reference `exerciseId` + `academyVersion` and fetch full academy content separately. Preliminary payload includes a compact `exerciseAcademy` reference (version, quality score, module types, media status).

## Future AI Assistant

Academy entries provide structured teaching points and module boundaries for future AI Studio Assistant:

- Ground responses in canonical identity + academy teaching
- Respect coach overrides on workout cards
- Surface missing quality items and media slots for production prioritization

## Production phases

1. **Top 25 exercises** — hand-refined teaching copy and quality targets
2. **Top 100 exercises** — expanded academy coverage across movement patterns
3. **Cinematic media** — fill planned media slots with production video
4. **Coach customization** — coach-branded intro/note slots
5. **Adaptive delivery** — client skill level, lesson module gating, app-side academy fetch

## Deferred (Sprint 1.5)

- Backend / Firestore persistence
- Media upload pipeline
- AI content generation
- Mobile publishing and academy CDN/API
- Shared domain package extraction (professional-only for now)
