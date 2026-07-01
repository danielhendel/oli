# Professional Workout Studio — Simplification Audit & Redesign Recommendation

**Audit date:** 2026-06-30  
**Route audited:** `http://localhost:3100/studio/workouts/new`  
**Scope:** Repo truth only — no source changes except this document  
**Related audit:** [professional-workout-studio-exercise-library-media-os-audit.md](./professional-workout-studio-exercise-library-media-os-audit.md) (media OS / library depth)

---

## 1. Executive Summary

### What exists today

Oli has a **functional Professional Workout Studio prototype** in `apps/professional` — a Next.js 15 app with a three-column authoring workspace, rich domain models, Exercise Experience Studio (six tabs), Exercise Academy intelligence, and Exercise Media OS (including M9–M15 image-pack / candidate-production panels). Canonical exercises flow from `EXERCISE_LIBRARY_V1` via `exerciseLibraryAdapter.ts`. Drag-and-drop from library to blocks works. Volume projection and quality checklist are computed from real draft state.

**Persistence is in-memory only.** `useWorkoutStudioDraft` holds workouts in React context; mutations auto-upsert the active workout but there is **no** `localStorage`, **no** explicit Save button, and **no** Assign flow. The workout index at `/studio/workouts` lists in-memory workouts until page refresh.

### Why it feels too complicated

The product intention is correct — Oli is a Health OS creative studio — but the **authoring IA treats every subsystem as co-primary**:

| Problem | Repo evidence |
| --- | --- |
| Everything visible at once | `WorkoutAuthorCanvas` stacks Overview + Projected Volume + Blocks + Tools in one scroll column; left nav only scrolls between them (`useWorkoutStudioNavigation`) |
| Blocks are not the default focus | Default `activeSection` is `"blocks"` but canvas still renders all sections above blocks; pro must scroll past meta and volume |
| Exercise editing is a mode switch | `openExerciseExperience` replaces the entire 3-column workspace with `ExerciseExperienceStudio` |
| Media factory leaks into workout path | `ExerciseMediaTab` renders `CandidateReviewPanel`, `ImagePackReadinessPanel`, `Top25KeyframeSpecReadinessPanel`, `CandidateImageProductionPanel`, `BenchPressKeyframeCandidateImportPanel` inline |
| Prescription editing is separated from blocks | `WorkoutExerciseCardEditor` shows read-only summary + **Open Experience**; inline sets live only in `ExerciseSetsTab` inside the studio |
| Save / Assign are not outcomes | `saveWorkout` exists in context but is never called from UI; no assign model or UI |
| Quality signals compete with building | Left rail shows quality %, 7 nav items, embedded `WorkoutQualityCard`, plus volume stats — while library column is always open |

### Recommended simplified direction

**"Build the workout first. Add rich learning and personalization only when needed."**

Transform the studio from a **scroll-spy multi-panel canvas** into a **mode-switching shell** with three primary modes and two header outcomes:

| Zone | Recommendation |
| --- | --- |
| **Left rail** | Overview · Workout Stats · **Blocks** (default after title set) |
| **Header** | Workout title (editable) · **Save** · **Assign** · Preview |
| **Center** | Single mode content — no stacked sections |
| **Right rail** | Exercise library **only in Blocks mode** |
| **Advanced** | Exercise modal/sheet (Sets summary + Media/Lesson/Coaching/Progression/Tracking tabs); media factory collapsed behind dev flag |

Preserve all domain power (`WorkoutExperience`, `WorkoutExerciseCard`, `buildAppWorkoutDraftPayload`, media OS, academy) behind progressive disclosure.

### Top 5 changes

| # | Change | Severity addressed | Primary files |
| --- | --- | --- | --- |
| 1 | Replace scroll-spy canvas with **mode-switching shell** (Overview / Stats / Blocks) | P0 cognitive overload | `NewWorkoutStudioPageContent.tsx`, `WorkoutAuthorCanvas.tsx`, `useWorkoutStudioNavigation.ts`, new `WorkoutStudioModeShell.tsx` |
| 2 | Make **Blocks the default landing** with inline prescription row editing | P0 blocks not primary | `WorkoutExerciseCardEditor.tsx`, new `WorkoutExercisePrescriptionRow.tsx` |
| 3 | Replace full-page `ExerciseExperienceStudio` with **Advanced Exercise Modal**; hide media factory by default | P0 media factory in path | `ExerciseExperienceStudio.tsx` → modal shell, `ExerciseMediaTab.tsx` |
| 4 | Add **Save** and **Assign** as header CTAs with local/mock persistence | P0 no obvious outcomes | `useWorkoutStudioDraft.tsx`, new `coachWorkoutLibraryStorage.ts`, new `AssignWorkoutSheet.tsx` |
| 5 | Add **exercise thumbnail fallback utility** for library + block rows | P1 missing visual scan | new `resolveExerciseThumbnail.ts`, `WorkoutLibraryPanel.tsx` |

### Readiness score — simplified workout building

| Dimension | Today | After UX-2–4 (recommended) |
| --- | --- | --- |
| **Can a pro build a usable workout in &lt;5 min?** | Partial — yes with friction (must open Experience Studio for sets) | Yes — inline prescription in Blocks |
| **Are Save/Assign obvious?** | No | Yes — header CTAs |
| **Is media factory out of the default path?** | No | Yes — dev-collapsed |
| **Does state survive refresh?** | No | Yes — localStorage MVP (UX-5) |

**Overall readiness for simplified workout building: 3.5 / 10 today → target 8.0 / 10 after UX-2–UX-5.**

Domain/model readiness is high (7/10); **UX shell readiness is low** (3/10).

---

## 2. Current UX Map

### 2.1 Page structure

```
StudioShell (global nav: Dashboard · Clients · Workout Studio)
└── NewWorkoutStudioPageContent  [apps/professional/src/app/studio/workouts/new/NewWorkoutStudioPageContent.tsx]
    ├── pageHeader (eyebrow, title, subtitle, Preview Client Experience button)
    ├── IF exerciseExperienceContext:
    │       ExerciseExperienceStudio (full width, replaces workspace)
    └── ELSE studioWorkspace (3-column grid — page.module.css: 200px | 1fr | 340px)
            ├── navColumn → WorkoutBuilderNavigator
            ├── canvasColumn → WorkoutAuthorCanvas (scrollable, all sections stacked)
            └── libraryColumn → WorkoutLibraryPanel
    └── ClientExperiencePreviewPanel (modal overlay)
```

**Route entry:** `apps/professional/src/app/studio/workouts/new/page.tsx` wraps content in `WorkoutStudioProvider`.

**Layout CSS:** `page.module.css` — `grid-template-columns: 200px minmax(0, 1fr) 340px`; collapses to single column below 1100px with `max-height: 70vh` per column.

### 2.2 Current left rail — `WorkoutBuilderNavigator`

**File:** `apps/professional/src/components/workout-studio/WorkoutBuilderNavigator.tsx`

| Element | Content |
| --- | --- |
| **Signals row** | Quality %, Sets, Blocks, Exercises counts |
| **Nav items (7)** | Overview, Projected Volume, Blocks, Exercise Library, Workout Quality, Preview, Notes / Tools |
| **Embedded panel** | `WorkoutQualityCard` at bottom (`id="studio-quality"`) |

**Behavior:** `onNavigate` calls `scrollToSection` in `useWorkoutStudioNavigation.ts` — scroll-spy, **not** mode isolation. `"library"` scrolls the right column; `"preview"` opens `ClientExperiencePreviewPanel`.

**Nav sections defined in:** `apps/professional/src/features/workout-studio/workoutStudioNavigation.ts` — `BUILDER_NAV_SECTIONS` (7 items).

### 2.3 Current middle canvas — `WorkoutAuthorCanvas`

**File:** `apps/professional/src/components/workout-studio/WorkoutAuthorCanvas.tsx`

All sections render **simultaneously** in one scrollable column:

| Section | `id` / ref | Component / content |
| --- | --- | --- |
| **Overview** | `studio-overview` / `overviewRef` | Collapsible workout title, duration, difficulty, objective, desired adaptation, role in health system |
| **Projected Volume** | `studio-projected-volume` / `volumeRef` | `ProjectedVolumeCard` — primary/secondary sets, stabilizers, joint stress, flagged joints count |
| **Blocks** | `studio-blocks` / `blocksRef` | `WorkoutBlockCard` list, `AddBlockInline`, empty state |
| **Tools** | `studio-tools` / `toolsRef` | Placeholder: "Client context and advanced assignment tools will live here in a future sprint." |

**Not in center canvas:** `WorkoutQualityCard` lives in left nav, not center (despite `"quality"` nav item scrolling to `qualityRef` on left).

### 2.4 Current right rail — `WorkoutLibraryPanel`

**File:** `apps/professional/src/components/workout-studio/WorkoutLibraryPanel.tsx`

| Feature | Status |
| --- | --- |
| Search | Yes — muscles, equipment, name |
| Filter chips | 9 filters via `WORKOUT_LIBRARY_FILTERS` |
| Exercise cards | Name, muscles, equipment, Academy badge, expandable intelligence |
| **Thumbnail/image** | **No** — text-only cards |
| Drag | Yes — `draggable`, `LIBRARY_DRAG_MIME` |
| Click add | Yes — disabled without `selectedBlockId` |
| Custom exercise | Yes — `onAddCustomExercise` |
| List cap | First 80 results |

**Catalog source:** `listCanonicalWorkoutLibraryExercises()` in `exerciseLibraryAdapter.ts` → `EXERCISE_LIBRARY_V1`.

### 2.5 Current Exercise Experience Studio

**File:** `apps/professional/src/components/workout-studio/ExerciseExperienceStudio.tsx`

Triggered by **Open Experience** on `WorkoutExerciseCardEditor`. Replaces entire workspace.

| Area | Content |
| --- | --- |
| Header | `ExerciseCardHeader` — exercise name, canonical id, close |
| Tab nav | `ExerciseCardTabNav` — Sets, Media, Lesson, Coaching, Progression, Tracking |
| Tab workspace | `ExerciseCardTabWorkspace` routes to per-tab components |
| Live preview | `ExerciseExperienceLivePreview` — client-facing preview column |

**Tab definitions:** `apps/professional/src/components/workout-studio/exercise-card/types.ts`

### 2.6 Current Media tab panels (inside workout-building path)

**File:** `apps/professional/src/components/workout-studio/exercise-card/ExerciseMediaTab.tsx`

Beyond composer UI (slots, timeline, lesson director), the Media tab **embeds production panels**:

| Panel | Import path |
| --- | --- |
| `CandidateReviewPanel` | `@/features/exercise-media-os/candidate-review/CandidateReviewPanel` |
| `ImagePackReadinessPanel` | `@/features/exercise-media-os/image-pack/ImagePackReadinessPanel` |
| `Top25KeyframeSpecReadinessPanel` | `@/features/exercise-media-os/keyframe-spec/Top25KeyframeSpecReadinessPanel` |
| `CandidateImageProductionPanel` | `@/features/exercise-media-os/candidate-production/CandidateImageProductionPanel` |
| `BenchPressKeyframeCandidateImportPanel` | `@/features/exercise-media-os/candidate-production/BenchPressKeyframeCandidateImportPanel` |

Also includes `ProductionPipelineSection`, `DesignerIntelligencePanel`, `MediaPlaceholderCard`, `LessonPlaybackModal`.

**This is the primary "media factory in workout path" leak.**

### 2.7 State — local-only vs mock vs real

| State | Storage | File |
| --- | --- | --- |
| Active workout draft | React context (`useState`) | `useWorkoutStudioDraft.tsx` |
| Workout list | Same context `state.workouts` | `useWorkoutStudioDraft.tsx` |
| Sample seed | `seedSampleWorkout()` in initial state | `workoutStudioDraft.ts` |
| Session | Mock | `lib/mockSession.ts` |
| Clients | Mock array | `lib/mockClients.ts` |
| `localStorage` / `sessionStorage` | **None** in `apps/professional/src` | verified via grep |
| Firebase / Firestore | **None** in professional screens | grep clean |
| `saveWorkout` | Context API only, **not wired to UI** | `useWorkoutStudioDraft.tsx` |

**Auto-persistence:** Every `mutateActive` call upserts via `upsertWorkout` — edits persist in session memory but **lost on refresh**.

### 2.8 Save / Assign status

| Action | Exists? | Where |
| --- | --- | --- |
| **Save workout** | API only (`saveWorkout`) | `useWorkoutStudioDraft.tsx` — no button |
| **Load workout** | Yes | `/studio/workouts` index + `?workoutId=` param |
| **Draft payload export** | Pure function | `buildAppWorkoutDraftPayload.ts` — not exposed in UI |
| **Assign to client** | **No** | `WorkoutAuthorCanvas` tools placeholder only |
| **Client list** | Mock | `/clients` → `MOCK_CLIENTS` (1 client: Daniel Hendel) |
| **Client detail** | Route exists | `/clients/[id]/page.tsx` — no workout assignment |

### 2.9 Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/studio/workouts` | `app/studio/workouts/page.tsx` | In-memory workout list, "New Workout Experience" |
| `/studio/workouts/new?workoutId=` | `app/studio/workouts/new/page.tsx` | Authoring studio |
| `/clients` | `app/clients/page.tsx` | Mock client list |
| `/clients/[id]` | `app/clients/[id]/page.tsx` | Client detail (no assign) |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard shell |

---

## 3. User Feedback Interpretation

### Observed issues → concrete UX problems

| User feedback | Repo-root cause | Primary vs advanced |
| --- | --- | --- |
| Too many panels visible at once | 3-column grid + stacked canvas sections + quality card in nav | **Primary path overloaded** |
| Author Canvas + navigator + library + preview compete | All visible in default state; preview is modal but heavily promoted in nav | Primary |
| Media factory in workout path | 5 production panels in `ExerciseMediaTab` | **Advanced** wrongly in primary |
| Blocks not main authoring flow | Overview and volume render above blocks; exercise rows are summary-only | Primary |
| Sets/reps/RPE editing separated | `ExerciseSetsTab` only inside full-page studio | Primary gap |
| Advanced tabs feel required | Quality checklist scores coaching/progression; media readiness stars on every exercise row | Advanced framed as required |
| Save/Assign not obvious | No UI; tools section is empty placeholder | Primary outcome missing |
| Red issue badge unclear | `ProjectedVolumeCard` shows `flaggedJoints` count; no link to fix actions | Stats need action links |
| Pro shouldn't understand media factory | Production panels visible in Media tab during normal workout build | Advanced leak |

### Primary workflow (should be &lt;5 minutes)

1. Name workout (Overview)
2. Add blocks
3. Search/drag exercises from library
4. Edit sets/reps/RPE/rest/tempo inline
5. Glance at stats (optional)
6. Save to library
7. Assign to client (optional)

### Advanced workflow (on demand)

1. Customize media composer / lesson director
2. Add coaching narrative, progression rules, tracking schema
3. Media factory / candidate review / image pack (dev/media production)
4. Deep client preview per exercise

---

## 4. Recommended Simplified Flow

### 4.1 Evaluation of proposed left rail

| Proposed item | Recommendation |
| --- | --- |
| Overview | **Keep** — mode, not scroll target |
| Workout Stats | **Keep** — rename from "Projected Volume"; separate mode |
| Blocks | **Keep** — **default mode** after first title blur |
| Save | **Header CTA**, not left nav — saves are actions, not views |
| Assign | **Header CTA** opening sheet/modal — not a persistent mode |

### 4.2 Decision summary

| Question | Recommendation |
| --- | --- |
| Save/Assign: nav vs header? | **Header primary CTAs** + optional overflow menu (Save as Template, Duplicate) |
| Right library always visible? | **Only in Blocks mode** — hide in Overview/Stats to reduce noise |
| Live client preview always? | **Preview button** in header (keep current `ClientExperiencePreviewPanel`) |
| Workout Stats separate mode? | **Yes** — isolate `ProjectedVolumeCard` + quality issues + fix links |
| Overview fields only? | Title, description/goal, difficulty, duration, target client — **drop** "role in health system" from default Overview (move to advanced notes) |
| Blocks default landing? | **Yes** — after `title !== "Untitled Workout Experience"` or first visit preference |
| Simple vs advanced editing? | Inline row in Blocks; **Customize** opens Advanced Exercise Modal |
| Best IA for pros building all day? | Blocks-centric with fast keyboard/tab through prescription fields |

### 4.3 Final IA recommendation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [← Back]  [Workout Title ─────────────]     [Preview] [Save ▾] [Assign] │
├──────────┬──────────────────────────────────────────────┬───────────────┤
│ Overview │                                              │               │
│ Stats    │           MODE CONTENT (one at a time)       │  Library      │
│ ● Blocks │                                              │  (Blocks only)│
│          │                                              │               │
└──────────┴──────────────────────────────────────────────┴───────────────┘
```

| Zone | Behavior |
| --- | --- |
| **Header** | Editable title, Save dropdown (Save Draft / Save to Library), Assign sheet, Preview |
| **Left rail** | 3 modes: Overview, Workout Stats, Blocks (default) |
| **Center** | Single panel per mode — no vertical stacking |
| **Right rail** | `WorkoutLibraryPanel` visible only when `mode === "blocks"` |
| **Modal** | `AdvancedExerciseModal` — tabs: Media, Lesson, Coaching, Progression, Tracking (+ Sets detail); Media Factory collapsed |
| **Mobile** | Left rail → bottom tabs or hamburger; library becomes bottom sheet in Blocks mode |

---

## 5. Blocks-First Builder Spec

### 5.1 Current blocks representation

**Type:** `WorkoutBlock` in `types.ts`

```typescript
{ id, blockType, customTitle, notes, order, exercises: WorkoutExerciseCard[] }
```

16 block types via `WORKOUT_BLOCK_TYPES`. CRUD in `workoutStudioDraft.ts`: `addBlock`, `updateBlock`, `duplicateBlock`, `removeBlock`, `moveBlock`.

**UI:** `WorkoutBlockCard.tsx` — expand/collapse, block type select, custom title, notes modal, drag-drop zone, exercise list.

### 5.2 How exercises are added today

| Method | Implemented | File |
| --- | --- | --- |
| Click Add from library | Yes | `WorkoutLibraryPanel` → `addExerciseFromLibrary` |
| Drag from library to block | Yes | `LIBRARY_DRAG_MIME` + `WorkoutBlockCard.onDrop` |
| Custom exercise | Yes | `addCustomExercise` |
| Reorder exercises | Up/down buttons | `WorkoutExerciseCardEditor` |
| Move to another block | Select dropdown | `WorkoutExerciseCardEditor` |

**Canonical `exerciseId` preserved:** `createWorkoutStudioExerciseFromLibraryExercise.ts` copies `libraryExercise.exerciseId`.

### 5.3 Inline prescription editing — gap

| Field | Inline in block row? | Where editable today |
| --- | --- | --- |
| Sets (count) | Read-only summary | `ExerciseSetsTab` — add/remove sets |
| Reps | Read-only (`repRangeSummary`) | `ExerciseSetsTab` per-set `repRange` input |
| RPE | Read-only summary | `ExerciseSetsTab` per-set `targetRpe` |
| Rest | Read-only | `ExerciseSetsTab` per-set `restSeconds` |
| Tempo | Read-only | `ExerciseSetsTab` per-set `tempo` |
| Notes | No | Per-set notes in Sets tab |

**Requires Experience Studio today:** All prescription edits.

### 5.4 Target block builder spec

**Block card (simplified):**

- Header: Block N · title · type chip · collapse · duplicate · remove
- Body: exercise rows
- Footer: drop zone hint when empty

**Exercise row (new `WorkoutExercisePrescriptionRow`):**

| Column | Content |
| --- | --- |
| Thumbnail | 48×48 via `resolveExerciseThumbnail` |
| Name | `exerciseName` + subtle canonical id |
| Sets | Stepper or input → manipulates `designedSets` array |
| Reps | Inline input → applies to all sets or first set (with "apply all") |
| RPE | Inline input |
| Rest | Inline input (seconds) |
| Tempo | Inline input |
| Actions | Customize (modal) · Duplicate · Remove · Reorder |

**Immediate actions:** add, reorder, inline prescription, duplicate, remove.  
**Behind Customize:** Media, Lesson, Coaching, Progression, Tracking, per-set granularity, media factory.

### 5.5 Image thumbnail fallback (recommended utility)

**Proposed file:** `apps/professional/src/features/workout-studio/resolveExerciseThumbnail.ts`

**Fallback priority (audit from existing media systems):**

| Priority | Source | Existing code |
| --- | --- | --- |
| 1 | Approved Master Image Pack frame (`thumbnail` or first `16:9` frame) | `image-pack/buildApprovedMasterImagePack.ts`, `ImagePackReadinessPanel` (`frame.publicPath`) |
| 2 | Dev-test candidate `expectedPublicPath` | `candidate-review/data/benchPressMediaCandidates.ts` |
| 3 | Bench Press keyframe public paths | `image-pack/fixtures/approvedBenchPressImageCandidates.ts`, `BENCH_PRESS_KEYFRAME_PUBLIC_PATHS` |
| 4 | Media placeholder gradient | `MediaPlaceholderCard.tsx` pattern |
| 5 | Muscle/equipment icon placeholder | New lightweight fallback using `primaryMuscles[0]` + `equipment` from library adapter |

**Reuse:** `getExerciseMediaOsBundle` from `exerciseMediaRegistry.ts` for readiness; do not block thumbnail on readiness score.

**Apply in:** `WorkoutLibraryPanel.tsx`, `WorkoutExercisePrescriptionRow` (new).

---

## 6. Overview Mode Spec

**Center content only** — fields from `WorkoutExperience` + `WorkoutOverview`:

| Field | Model path | Notes |
| --- | --- | --- |
| Workout name | `title` | Required; replace "Untitled Workout Experience" placeholder |
| Description / goal | `overview.objective` | Primary goal copy |
| Desired adaptation | `overview.desiredAdaptation` | Optional secondary |
| Level | `difficulty` | beginner / intermediate / advanced / elite |
| Estimated duration | `estimatedDurationMinutes` | Number input |
| Target client | `clientName` | Dropdown from `MOCK_CLIENTS` initially |
| Tags | **New** optional `tags: string[]` on `WorkoutExperience` | Local-only MVP |
| Notes | **New** optional `coachNotes: string` | Replaces prominent "role in health system" in default UI |

**Hide from default Overview:** `overview.roleInHealthSystem` — move to advanced workout settings accordion.

**Component reuse:** Extract overview fields from `WorkoutAuthorCanvas` into `WorkoutOverviewPanel.tsx`.

---

## 7. Workout Stats Mode Spec

**Center content:** Reuse and extend `ProjectedVolumeCard` + quality issues.

### Stats that exist today

| Stat | Source |
| --- | --- |
| Primary / secondary set counts | `buildWorkoutVolumeAttribution.ts` |
| Per-muscle volume bars | `ProjectedVolumeCard` |
| Stabilizer volume | `ProjectedVolumeCard` |
| Joint stress levels | `ProjectedVolumeCard` |
| Flagged joints count | `countFlaggedJoints` |
| Missing intelligence count | `volumeAttribution.totalExercisesMissingIntelligence` |
| Quality checklist % | `buildWorkoutQualityChecklist.ts` |
| Total projected sets | `buildWorkoutProjectedVolume.ts` |

### Stats useful to pros

- Total sets, primary muscle distribution, movement pattern balance (derive from library `movementPattern`)
- Joint stress warnings
- Missing academy intelligence count
- Exercises without designed sets

### Stats missing (recommend derive, no new backend)

- Stimulus / fatigue proxy (heuristic from set count × RPE)
- Movement pattern balance chart (group by `movementPattern` from exercises)
- "Issues" unified list with fix actions

### What "2 issues" should mean

Consolidate into **`WorkoutIssuesPanel`**:

| Issue type | Condition | Fix action |
| --- | --- | --- |
| No blocks | `blocks.length === 0` | "Add block" → switch to Blocks mode |
| Exercise missing sets | `designedSets.length === 0` | Link to exercise row in Blocks |
| High joint stress | `flaggedJoints > 0` | Scroll to joint detail in stats |
| Missing intelligence | `missingIntelligenceCount > 0` | Informational — academy gap |
| Incomplete purpose | empty objective | Link to Overview |

**Do not** use quality checklist incomplete items (coaching, progression) as blocking "issues" — those are **enhancements**, not errors.

### Simplified Stats layout

1. Summary cards: Total sets · Primary muscles · Flagged joints · Issues count
2. Muscle distribution (existing bars)
3. Joint stress (existing)
4. Issues list with fix links
5. Optional: movement balance (new derived section)

**No block editing** in this mode.

---

## 8. Save to Coach Library Spec

### What exists

| Asset | Status |
| --- | --- |
| Workout index route | `/studio/workouts` — in-memory list |
| `WorkoutExperience` model | Full draft model in `types.ts` |
| `saveWorkout` | Context upsert — no UI |
| `buildAppWorkoutDraftPayload` | Export-ready `preliminary-v1` payload |
| localStorage | **None** |
| Backend | **None** |

### Local/mock MVP (UX-5)

**Proposed files:**

- `apps/professional/src/features/workout-studio/coachWorkoutLibraryStorage.ts` — `localStorage` keyed `oli.coachWorkoutLibrary.v1`
- `apps/professional/src/features/workout-studio/types.ts` — add `CoachWorkoutLibraryItem` wrapper: `{ id, savedAt, label, kind: "draft" | "template", workout: WorkoutExperience, payload?: PreliminaryAppWorkoutDraftPayload }`

**Header Save menu:**

- **Save Draft** — upsert to localStorage + context
- **Save as Template** — same with `kind: "template"`
- **Duplicate** — from library list

**Load:** `/studio/workouts` reads from localStorage + context merge.

### Backend later (UX-7 design only)

- Firestore collection `coachWorkoutTemplates/{trainerId}/items`
- Storage for exported payload snapshots
- Version history, sharing, team library

### Data to save

Full `WorkoutExperience` + computed `buildAppWorkoutDraftPayload` snapshot + metadata (`savedAt`, `kind`, `trainerId`).

### Tests needed

- `coachWorkoutLibraryStorage.test.ts` — round-trip, exerciseId preserved
- Component test — Save button calls storage

---

## 9. Assign to Client Spec

### What exists

| Asset | Status |
| --- | --- |
| `MOCK_CLIENTS` | 1 client (`id: "self"`, Daniel Hendel) |
| `/clients`, `/clients/[id]` | List + detail pages, no assignment |
| Assignment model | **None** |
| Client workout plan | **None** |

### Local/mock MVP (UX-6)

**Proposed types** in `apps/professional/src/features/workout-studio/types.ts`:

```typescript
type ClientWorkoutAssignmentDraft = {
  id: string;
  workoutId: string;
  clientId: string;
  startDate: string; // ISO date
  scheduleNotes: string;
  repeatFrequency: "once" | "weekly" | "custom";
  clientMessage: string;
  trackingExpectations: string;
  createdAt: string;
  status: "draft" | "confirmed";
};
```

**Storage:** `localStorage` key `oli.clientWorkoutAssignments.v1` — **clearly labeled prototype** in UI.

**Assign flow (sheet):**

1. Select client (mock dropdown)
2. Start date
3. Repeat frequency
4. Client-facing message
5. Preview (`buildWorkoutExperiencePreview`) — reuse `ClientExperiencePreviewPanel`
6. Confirm → writes local assignment draft with toast "Prototype assignment saved locally"

### Backend later

- Assign to client document, push notification, consumer app delivery via `PreliminaryAppWorkoutDraftPayload`
- Group/team assignment
- Scheduling integration

### Minimum fields

client, start date, schedule/repeat, notes, client-facing message, tracking expectations — all listed above.

---

## 10. Advanced Exercise Modal Spec

### What belongs in modal

| Tab | Reuse component | Default visibility |
| --- | --- | --- |
| **Prescription** (primary section) | Summary + link to full `ExerciseSetsTab` | Always visible at top |
| Media | `ExerciseMediaTab` (composer UI only) | Tab |
| Lesson | `ExerciseLessonTab` | Tab |
| Coaching | `ExerciseCoachingTab` | Tab |
| Progression | `ExerciseProgressionTab` | Tab |
| Tracking | `ExerciseTrackingTab` | Tab |

### What to hide/collapse

| Panel | Treatment |
| --- | --- |
| `CandidateReviewPanel` | Dev/Media Production accordion |
| `ImagePackReadinessPanel` | Dev accordion |
| `Top25KeyframeSpecReadinessPanel` | Dev accordion |
| `CandidateImageProductionPanel` | Dev accordion |
| `BenchPressKeyframeCandidateImportPanel` | Dev accordion |
| `ProductionPipelineSection` | Dev accordion |

**Gate:** `process.env.NEXT_PUBLIC_OLI_MEDIA_FACTORY_DEV === "1"` or feature flag in `apps/professional/src/lib/featureFlags.ts`.

### Modal shell structure

```
┌──────────────────────────────────────────────────────┐
│ [thumbnail] Exercise Name · bench_press        [×]   │
│ 3 sets · 8-10 reps · RPE 8 · 90s rest                │
├──────────────────────────────────────────────────────┤
│ Prescription detail (ExerciseSetsTab compact)        │
├──────────────────────────────────────────────────────┤
│ Media | Lesson | Coaching | Progression | Tracking    │
│ [tab content]                                        │
├──────────────────────────────────────────────────────┤
│ ▸ Media Production (dev only)                        │
└──────────────────────────────────────────────────────┘
```

**Reuse:** `ExerciseExperienceStudio` internals via `ExerciseCardTabWorkspace`; replace full-page wrapper with `StudioModal` or new `AdvancedExerciseModal.tsx`.

**Live preview:** Optional toggle — default off in modal; pros use header Preview for full workout.

---

## 11. Component Reuse Plan

| Component / file | Action | Reason | Risk | Tests needed |
| --- | --- | --- | --- | --- |
| `NewWorkoutStudioPageContent.tsx` | **Split** — mode state, header CTAs | Orchestration hub | High — central | Mode switching integration |
| `WorkoutAuthorCanvas.tsx` | **Split** → `WorkoutOverviewPanel`, `WorkoutStatsPanel`, `WorkoutBlocksPanel` | End stacked canvas | Medium | Per-panel tests |
| `WorkoutBuilderNavigator.tsx` | **Reuse** — reduce to 3 modes | Keep signals row simplified | Low | Update `workoutStudioLayout.test.ts` |
| `useWorkoutStudioNavigation.ts` | **Replace** with `useWorkoutStudioMode.ts` | Mode switch not scroll | Medium | New hook tests |
| `workoutStudioNavigation.ts` | **Update** — 3 sections + deprecate scroll sections | IA change | Low | Layout test update |
| `WorkoutBlockCard.tsx` | **Reuse** — simplify header | Core block UX | Low | Existing draft tests |
| `WorkoutExerciseCardEditor.tsx` | **Replace** row UI with `WorkoutExercisePrescriptionRow` | Inline prescription | Medium | Inline edit tests |
| `WorkoutLibraryPanel.tsx` | **Reuse** — add thumbnails, simplify cards | Palette | Low | Thumbnail fallback tests |
| `ExerciseExperienceStudio.tsx` | **Move behind modal** | Progressive disclosure | Medium | Modal open/close |
| `ExerciseCardTabWorkspace.tsx` | **Keep as-is** | Tab routing works | Low | — |
| `ExerciseSetsTab.tsx` | **Reuse** in modal + compact row editor extract | Sets logic proven | Low | Row editor unit tests |
| `ExerciseMediaTab.tsx` | **Split** — composer vs factory panels | Stop factory leak | Medium | Factory hidden by default test |
| `CandidateReviewPanel` etc. | **Keep** — dev accordion only | Preserve M9–M15 | Low | Flag gating test |
| `ProjectedVolumeCard.tsx` | **Reuse** in Stats mode | Rich stats exist | Low | — |
| `WorkoutQualityCard.tsx` | **Move** to Stats mode issues section | Remove nav clutter | Low | — |
| `ClientExperiencePreviewPanel.tsx` | **Keep as-is** | Preview works | Low | — |
| `LessonPlaybackModal.tsx` | **Keep** — inside Media tab | Playback prototype | Low | — |
| `AddBlockInline.tsx` | **Keep** | Block creation | Low | — |
| `BlockNotesEditor.tsx` | **Keep** — modal | Block notes | Low | — |
| `StudioModal.tsx` | **Reuse** for Advanced Exercise Modal | Existing pattern | Low | — |
| `buildAppWorkoutDraftPayload.ts` | **Keep** — wire to Save | Export seam | Low | Existing tests |
| `useWorkoutStudioDraft.tsx` | **Extend** — localStorage hydrate | Persistence | Medium | Storage integration |

---

## 12. Data Model Plan

### Reusable as-is

| Type | File |
| --- | --- |
| `WorkoutExperience` | `types.ts` |
| `WorkoutBlock` | `types.ts` |
| `WorkoutExerciseCard` | `types.ts` |
| `WorkoutDesignedSet` | `types.ts` |
| `ExerciseDesignFields`, `ExercisePrescriptionFields`, `ExerciseLoggingSchema` | `types.ts` |
| `WorkoutLibraryExercise` | `exerciseLibraryAdapter.ts` |
| `PreliminaryAppWorkoutDraftPayload` | `buildAppWorkoutDraftPayload.ts` |

### Too UI-shaped (acceptable for now)

- `ExerciseExperienceRef` — workspace pointer, fine for modal state
- `BuilderNavSection` — will change to `WorkoutStudioMode`

### Proposed additions (local-first)

| Type | Purpose | Location |
| --- | --- | --- |
| `WorkoutStudioMode` | `"overview" \| "stats" \| "blocks"` | `workoutStudioNavigation.ts` |
| `CoachWorkoutLibraryItem` | Saved template/draft wrapper | `types.ts` |
| `ClientWorkoutAssignmentDraft` | Mock assignment | `types.ts` |
| `ExerciseThumbnailSource` | `{ src?: string; fallback: "image-pack" \| "candidate" \| "placeholder" }` | `resolveExerciseThumbnail.ts` |
| `AdvancedExerciseModalState` | `{ blockId, exerciseCardId, activeTab }` | `exerciseExperienceWorkspace.ts` |

### Local-only vs backend later

| Data | Now | Later |
| --- | --- | --- |
| Active draft | Context + localStorage | Firestore real-time |
| Coach library | localStorage | Firestore templates |
| Assignments | localStorage mock | Firestore + consumer delivery |
| Media assets | Public static paths | Storage CDN |
| Canonical exercises | `EXERCISE_LIBRARY_V1` | Same — never fork |

### Never store

- Media factory dev queues in workout template
- Raw candidate production packets in assignment payload
- Normalized/renamed `exerciseId` values

---

## 13. Implementation Roadmap

### Sprint UX-1 — Audit + UX Spec ✅ (this document)

**Deliverable:** This audit only.

### Sprint UX-2 — Simplified Studio Shell

**Objective:** Mode-switching layout; header Save/Assign placeholders; Blocks default.

**Files to modify:**

- `NewWorkoutStudioPageContent.tsx`
- `WorkoutBuilderNavigator.tsx`
- `workoutStudioNavigation.ts`
- `useWorkoutStudioNavigation.ts` → `useWorkoutStudioMode.ts`
- `page.module.css`

**Files to create:**

- `WorkoutStudioHeader.tsx`
- `WorkoutOverviewPanel.tsx`
- `WorkoutStatsPanel.tsx`
- `WorkoutBlocksPanel.tsx` (extract from `WorkoutAuthorCanvas`)

**Acceptance criteria:**

- Only one center mode visible at a time
- Library column hidden outside Blocks mode
- Header shows Save (disabled stub) + Assign (disabled stub) + Preview
- Default mode = Blocks when workout has title
- All existing draft mutations still work
- No backend calls

### Sprint UX-3 — Blocks-First Builder

**Objective:** Inline prescription rows; library thumbnails; drag/drop preserved.

**Files:** `WorkoutExercisePrescriptionRow.tsx`, `resolveExerciseThumbnail.ts`, `WorkoutLibraryPanel.tsx`, `WorkoutBlockCard.tsx`

**Acceptance criteria:**

- Edit sets/reps/RPE/rest/tempo without opening modal
- Thumbnails in library + rows with fallback chain
- `exerciseId` unchanged after add/drag
- Customize opens advanced modal stub

### Sprint UX-4 — Advanced Exercise Modal

**Objective:** Replace full-page studio; hide media factory by default.

**Files:** `AdvancedExerciseModal.tsx`, refactor `ExerciseExperienceStudio.tsx`, `ExerciseMediaTab.tsx`

**Acceptance criteria:**

- Full-page studio removed from default flow
- All 6 tabs accessible in modal
- Media factory panels behind dev flag
- `ExerciseSetsTab` still works for per-set granularity

### Sprint UX-5 — Local Coach Workout Library

**Files:** `coachWorkoutLibraryStorage.ts`, `SaveWorkoutMenu.tsx`, update `/studio/workouts/page.tsx`

**Acceptance criteria:**

- Save Draft persists across refresh
- Load + duplicate from library index
- `buildAppWorkoutDraftPayload` stored optionally

### Sprint UX-6 — Local Client Assignment

**Files:** `AssignWorkoutSheet.tsx`, `clientAssignmentStorage.ts`, `types.ts`

**Acceptance criteria:**

- Assign flow with mock client, preview, confirm
- localStorage only — UI labels "prototype"
- No fake backend success messaging

### Sprint UX-7 — Persistence Backend Design (doc only)

Firestore/Storage/API design — no implementation in professional app.

---

## 14. Test Plan

### Existing coverage

| Suite | File | Focus |
| --- | --- | --- |
| Draft mutations | `workoutStudioDraft.test.ts` | Blocks, exercises, exerciseId |
| Layout | `workoutStudioLayout.test.ts` | 7 nav sections (will change) |
| Designer layout | `workoutDesignerLayout.test.ts` | Designer structure |
| Volume | `workoutVolumeAttribution.test.ts` | Attribution math |
| Exercise card | `exerciseCard.test.ts` | Card domain |
| Experience workspace | `exerciseExperienceWorkspace.test.ts` | Context resolution |

### Required future tests

| Test | Type |
| --- | --- |
| Left nav mode switching | Component / integration |
| Overview saves local draft fields | Unit + storage |
| Stats mode shows volume only (no blocks) | Component |
| Blocks inline sets/reps/RPE | Unit `WorkoutExercisePrescriptionRow` |
| exerciseId preserved after add/drag/drop | Existing + extend |
| `resolveExerciseThumbnail` fallback order | Unit |
| Advanced modal opens correct exercise | Component |
| Save draft local-only | Storage unit |
| Assign draft local-only | Storage unit |
| Media factory hidden when flag off | Component |
| No react-native imports | Guard (existing pattern) |
| No firebase in screens | Guard |
| No fake assignment persistence messaging | Component copy test |

---

## 15. Risk Register

| ID | Severity | Risk | File(s) | Current behavior | Impact | Recommendation | Sprint | Tests | Backend? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | **P0** | UI overload blocks adoption | `WorkoutAuthorCanvas`, `NewWorkoutStudioPageContent` | All sections stacked | Pros bounce | Mode-switching shell | UX-2 | Mode tests | No |
| R2 | **P0** | Media factory in workout path | `ExerciseMediaTab.tsx` | 5 production panels visible | Pros think factory is required | Dev accordion + flag | UX-4 | Flag test | No |
| R3 | **P0** | No Save/Assign outcomes | `useWorkoutStudioDraft`, studio UI | No buttons; refresh loses state | Can't ship workflow | Header CTAs + localStorage | UX-5/6 | Storage tests | Later |
| R4 | **P0** | Inline prescription gap | `WorkoutExerciseCardEditor` | Summary only | Can't finish workout fast | Prescription row | UX-3 | Inline tests | No |
| R5 | **P1** | Drag/drop undiscoverable | `WorkoutLibraryPanel`, `WorkoutBlockCard` | Works but text-only library | Slower authoring | Thumbnails + affordances | UX-3 | DnD tests | No |
| R6 | **P1** | Quality checklist implies required coaching | `buildWorkoutQualityChecklist` | % in nav | False "incomplete" anxiety | Move to Stats as enhancements | UX-2 | Checklist copy | No |
| R7 | **P1** | Issues unclear | `ProjectedVolumeCard` | flagged joints number only | No fix path | `WorkoutIssuesPanel` with links | UX-2 | Issues unit | No |
| R8 | **P1** | False save confidence | N/A | Auto upsert in memory | User thinks saved | Explicit Save + toast | UX-5 | UI test | No |
| R9 | **P2** | Breaking canonical exerciseId | `createWorkoutStudioExerciseFromLibraryExercise` | Correct today | Data corruption | Don't touch adapter normalization | — | Existing tests | No |
| R10 | **P2** | Breaking existing tests | `workoutStudioLayout.test.ts` | Expects 7 sections | CI fail | Update in UX-2 | UX-2 | Update test | No |
| R11 | **P2** | Accidental backend scope | — | Temptation to add Firestore | Sprint creep | localStorage only until UX-7 | UX-5–6 | — | Later |
| R12 | **P2** | Thumbnail fallback confusion | image-pack fixtures | Bench press only has paths | Wrong thumbnails | Document fallback; placeholder default | UX-3 | Fallback tests | No |
| R13 | **P3** | Removing Oli differentiation | — | Over-simplification risk | Generic coach app | Keep modal tabs + preview | UX-4 | — | No |
| R14 | **P3** | Mobile layout regression | `page.module.css` | 3-col collapse at 1100px | Poor mobile | Bottom sheet library | UX-2 | Responsive | No |

---

## 16. Final Recommendation

### Should we implement the simplified shell next?

**Yes.** Domain layer is ready; UX shell is the bottleneck. The highest-leverage change is **UX-2: Simplified Studio Shell** — mode switching + header CTAs + library only in Blocks — without touching `EXERCISE_LIBRARY_V1`, media OS internals, or backend.

### Exact next sprint

**Sprint UX-2 — Simplified Studio Shell**

### First files to touch

1. `apps/professional/src/features/workout-studio/workoutStudioNavigation.ts`
2. `apps/professional/src/features/workout-studio/useWorkoutStudioMode.ts` (new)
3. `apps/professional/src/components/workout-studio/WorkoutStudioHeader.tsx` (new)
4. `apps/professional/src/app/studio/workouts/new/NewWorkoutStudioPageContent.tsx`
5. `apps/professional/src/components/workout-studio/WorkoutBuilderNavigator.tsx`

### What not to touch yet

- `lib/workouts/exercises/library.v1.ts` / `EXERCISE_LIBRARY_V1`
- `exerciseLibraryAdapter.ts` canonical ID mapping
- Media OS feature modules (M9–M15) — only hide in UI in UX-4
- Backend / Firestore / Storage / APIs
- `ExerciseSetsTab` domain logic — reuse, don't rewrite
- Full deletion of `ExerciseExperienceStudio` — wrap first, retire later

---

## Appendix A — Section A answers (IA checklist)

1. **Page structure:** 3-column grid + optional full-page Exercise Experience Studio — see §2.1  
2. **Left rail:** Signals + 7 scroll targets + embedded quality card — see §2.2  
3. **Middle canvas:** Stacked Overview, Volume, Blocks, Tools — see §2.3  
4. **Right rail:** Always-visible library — see §2.4  
5. **Exercise Experience Studio:** 6-tab full-page editor — see §2.5  
6. **Media tab panels:** 5 factory panels + composer — see §2.6  
7. **Local-only state:** React context — see §2.7  
8. **Save/assign actions:** saveWorkout unused; no assign — see §2.8  
9. **Library/assignment routes:** `/studio/workouts`, `/clients` mock only — see §2.9  
10. **Mock vs real:** All local/mock — no Firebase in professional app

## Appendix B — 60-second / 5-minute pro tasks

| Timebox | Should be possible |
| --- | --- |
| **&lt;60 sec** | Add block, add 3 exercises via click, default sets |
| **&lt;5 min** | Name workout, 2 blocks, 6 exercises, inline RPE/rest, glance stats, save draft |

**Today:** 60-second task blocked by default sets requiring Experience Studio for edits.

## Appendix C — Commands run post-audit

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace @oli/professional run typecheck` | **PASS** | `tsc --noEmit` clean |
| `npm --workspace @oli/professional run lint` | **PASS** | ESLint clean |
| `npm --workspace @oli/professional run test` | **PASS** | 44 suites / 384 tests |
| `npm --workspace @oli/professional run build` | **PASS** | Next.js 15.5.19 production build |
| `npm run typecheck` | **PASS** | Root `tsc -b` clean |
| `npm run lint` | **PASS** | Root ESLint clean |
| `npm run test -- --ci --runInBand` | **PASS** | Root Jest (required network for Firestore emulator) |

**Audit-only change:** Only this document was added/modified; no source code changes.
