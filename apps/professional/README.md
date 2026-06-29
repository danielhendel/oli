# Oli Professional Studio (Prototype)

Local web prototype for the Professional Portal and Workout Studio.

## Run locally

From the repo root:

```bash
npm install
npm --workspace @oli/professional run dev
```

Open [http://localhost:3100](http://localhost:3100)

## Routes

- `/` — landing
- `/login` — mock trainer login
- `/dashboard` — studio dashboard
- `/clients` — mock client list
- `/clients/self` — self client workspace
- `/studio/workouts` — workout experience index
- `/studio/workouts/new` — Workout Studio Author Canvas
- `/unauthorized` — placeholder

## Workout Studio (prototype)

Workout Studio currently creates a **local prototype draft** in React state only.

### Two creative workspaces

1. **Workout Architecture Studio** — compose the workout at the workout level: overview, projected volume, blocks, exercise order, volume balance, and workout flow. Exercise cards on the canvas are compact summaries.
2. **Exercise Experience Studio** — open any exercise to design it deeply in a dedicated full-screen workspace: Sets, Media (Exercise Experience Builder), Lesson, Coaching, Progression, Tracking, plus a live client preview panel.

The mental model mirrors Figma / Keynote: compose the larger product on the canvas, open a component to design it deeply, then return without losing draft state. Exercise details are **not** edited inline on the main canvas.

This split uses **in-page full-screen workspace** state (not a separate route) so the local draft stays in memory. A dedicated route can come later when persistence lands.

- **Canonical exercises** come from `lib/workouts/exercises/library.v1.ts` (`EXERCISE_LIBRARY_V1`) via a thin adapter — no duplicate exercise catalog.
- Drafts preserve **canonical `exerciseId`** (snake_case) where available; custom exercises use `source: "custom"`.
- Workouts are organized into **blocks** (Warm Up, Primary Lift, Superset, etc.) intended to map to the mobile journal's workout blocks (`warmup`, `sets`, `superset`, `circuit`, `cooldown`, `cardio`).
- Each exercise opens into the **Exercise Experience Studio** with tabbed sections (Sets · Media · Lesson · Coaching · Progression · Tracking) and a live client preview — one section at a time, not a long form on the canvas.
- **Workout Builder Navigator** (left) replaces the client context panel — jump to Overview, Projected Volume, Blocks, Library, Quality, Preview.
- **Projected Volume** uses `buildWorkoutVolumeAttribution` — Primary / Secondary / Stabilizers-Joint tabs with mobile-style progress bars and detail modals. Primary uses Academy Intelligence when available; falls back to `buildWorkoutProjectedVolume` taxonomy logic. Secondary, stabilizer, and joint insights require intelligence overlay data.
- **Workout Quality** checklist stays in the left navigator only (removed from middle canvas).
- Block notes edit via **Block Notes** button/modal — not always visible on canvas.
- **Add block** controls sit inline below blocks (or centered in empty canvas).
- Canvas workspace is a **fixed-height 3-column layout** (navigator · canvas · library) with **independent vertical scroll** per column — no horizontal page scroll.
- **Coaching details** (why, setup, cues, progression, etc.) are intended for client experience delivery in the app.
- **Exercise Academy Intelligence** (`intelligence-v1`) is an educational overlay on canonical exercise IDs — primary/secondary muscles, stabilizers, joint considerations (coaching guidance, not medical diagnosis), programming use cases, fatigue profile, and substitutions. Top 20 draft entries seeded in `data/top20ExerciseAcademyIntelligence.ts`.
- **Exercise Academy** (`src/features/exercise-academy/`) builds reusable teaching knowledge from canonical exercises — lesson modules, media plan architecture, and quality scoring. Workout Studio surfaces Academy info inside “Customize coaching details”; card-level coaching edits remain client/session-specific.
- **Exercise Media OS** (`src/features/exercise-media-os/`) defines master media packages, media blueprints, composer state, and client media timelines. The Media tab lets professionals customize how clients experience Oli's out-of-the-box media — without filming or uploading. **`bench_press` includes a complete local pilot Master Media Package (M4)** with approved placeholder slots; other exercises remain planned. **Sprint M5** adds the first **Exercise Product Pipeline** for Bench Press. **Sprint M6** adds **Lesson Playback Prototype**. **Sprint M7** adds **asset-backed video playback** — approved local files play via HTML video; missing assets fall back to storyboard placeholders (`public/media/exercises/bench_press/`).
- `buildAppWorkoutDraftPayload()` produces a **preliminary** `preliminary-v1` payload — not a finalized consumer contract. Canonical exercises include a compact `exerciseAcademy` reference; per-exercise `mediaExperience` summarizes composer selections and timeline metadata.
- Legacy **Projected Volume** (`buildWorkoutProjectedVolume`) remains for quality checklist and backward-compatible payload fields — primary muscle set rollups aligned with mobile taxonomy.

### Exercise Academy vs exercise library

| Layer | Location | Purpose |
| --- | --- | --- |
| Canonical library | `lib/workouts/exercises/library.v1.ts` | Single source of truth for exercise identity |
| Exercise Academy | `apps/professional/src/features/exercise-academy/` | Teaching foundation derived from canonical metadata |
| Academy Intelligence | `apps/professional/src/features/exercise-academy/` (`intelligence-v1`) | Designer education overlay — muscles, stabilizers, joint considerations, programming guidance |
| Exercise Media OS | `apps/professional/src/features/exercise-media-os/` | Master media packages, composer, client timeline (architecture only in M1) |
| Workout card coaching | Workout Studio exercise editor | Session/client-specific overrides |

Academy media slots remain **planned architecture** in Exercise Academy. Exercise Media OS (`blueprint-v1` / `master-v1`) is the professional-facing media composer layer — no uploads yet.

See also:
- `docs/professional-platform/Exercise Academy Architecture v1.md`
- `docs/professional-platform/Exercise Media OS Architecture v1.md`
- `docs/professional-platform/Bench Press Master Exercise Product v1.md`

**Not implemented yet:** publishing, assignment, backend persistence, Firestore writes, or user permission/ownership flows. Future assignment must go through API + the platform permission model.

## Notes

- Mock data and local React state only
- No backend, Firestore, permissions, or publishing
- Do not import React Native UI from `lib/ui`
