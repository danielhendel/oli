# Sprint 13.1 — Canonical strength logging path decision

**Date:** 2026-03-07  
**Scope:** Single primary strength logging path; smallest safe change.

---

## A. Dependency map (exact references)

### "/(app)/workouts/log" and workouts/log

| File | Symbol / usage | How it references | Type |
|------|----------------|-------------------|------|
| `app/(app)/workouts/log.tsx` | `router.replace("/(app)/workouts/log")` | Clear URL after applying picked exercise | internal |
| `app/(app)/workouts/overview.tsx` | `router.push("/(app)/workouts/log")` | "Log workout" button | user-facing |
| `app/(app)/workouts/exercise-picker.tsx` | `pathname: "/(app)/workouts/log"` | Return from picker with params | internal |
| `app/(app)/_layout.tsx` | `Stack.Screen name="workouts/log"` | Stack registration | internal |
| `lib/modules/moduleSectionRoutes.ts` | `href: "/(app)/workouts/log"` | Section link (workouts.log) | internal (section config) |
| `app/(app)/workouts/__tests__/exercise-picker.test.tsx` | pathname assertion | Test expects replace to workouts/log | internal |
| `app/(app)/workouts/__tests__/workout-log-session.test.tsx` | describe("workouts/log session UI") | Test suite name | internal |

### "/(app)/training/strength/log" and training/strength/log

| File | Symbol / usage | How it references | Type |
|------|----------------|-------------------|------|
| `app/(app)/command-center/index.tsx` | `router.push({ pathname: "/(app)/training/strength/log", params: { day: dayKey } })` | StrengthSection onPressLog | **user-facing (only entry)** |
| `app/(app)/_layout.tsx` | `Stack.Screen name="training/strength/log"` | Stack registration | internal |
| `app/(app)/training/strength/log.tsx` | File itself | Screen component StrengthLogScreen | N/A |

### logStrengthWorkout

| File | Symbol / usage | How it references | Type |
|------|----------------|-------------------|------|
| `lib/api/usersMe.ts` | `export const logStrengthWorkout` | Definition | internal |
| `app/(app)/training/strength/log.tsx` | `import` + `logStrengthWorkout(built, token)` | Only app caller | user-facing (secondary flow) |

### buildManualStrengthWorkoutPayload

| File | Symbol / usage | How it references | Type |
|------|----------------|-------------------|------|
| `lib/events/manualStrengthWorkout.ts` | `export const buildManualStrengthWorkoutPayload` | Definition | internal |
| `lib/events/__tests__/manualStrengthWorkout.test.ts` | Multiple calls | Unit tests | internal |
| `app/(app)/training/strength/log.tsx` | `import` + `buildManualStrengthWorkoutPayload(payload)` | Only app caller | user-facing (secondary flow) |

### Docs/comments indicating ownership

- `docs/90_audits/WORKOUT_LOGGER_AUDIT.md` — states workouts/log is primary modern logger, training/strength/log is secondary; two flows are highest-risk issue.
- `app/(app)/training/strength/log.tsx` — line 1 comment only path; no "legacy" or "primary" wording before this sprint.

---

## B. Ownership recommendation (repo-truth only)

- **workouts/log as canonical:** Supported. It is the only path using journal + session engine + catalog exerciseId; it is the path from overview "Log workout" and from dash "Workouts"; it aligns with catalog-backed identity and future history.
- **training/strength/log distinct purpose:** It is the only path that calls the API ingest (`logStrengthWorkout`) and produces backend `strength_workout` events today. It uses free-text exercise names and a day param for post-submit navigation. So it serves "immediate API ingest with free-text exercises" (e.g. backfill or one-off manual entry). It is **not** the primary in-session logging UX.
- **Uncertainty:** Journal → backend sync is not implemented; workouts/log data stays local. So "canonical" means "primary UI path for logging," not "only path that hits the backend." We do not remove training/strength/log because it is the only current path that writes strength to the backend; we only remove ambiguity for the main entry.
- **Decision:** Make **workouts/log** the single **user-facing primary** strength logging path. **training/strength/log** remains in the repo as a **secondary/specialized** path (API-ingest form); label it in code and remove its only user-facing entry (Command Center Strength "Log") by redirecting that entry to workouts/log. No delete of the secondary flow.

---

## C. Exact file changes (implemented)

1. **app/(app)/command-center/index.tsx**  
   - StrengthSection `onPressLog`: from `router.push({ pathname: "/(app)/training/strength/log", params: { day: dayKey } })` to `router.push("/(app)/workouts/log")`.  
   - Comment above StrengthSection: "Canonical strength logging: workouts/log (journal + catalog)."

2. **app/(app)/training/strength/log.tsx**  
   - Add file-head comment: secondary/specialized path; API-ingest form with free-text exercises; primary strength logging is workouts/log.

3. **lib/modules/moduleReadiness.ts**  
   - `workouts.log`: from `SOON("Soon")` to `READY`.

4. **docs/90_audits/SPRINT_13_1_CANONICAL_LOG_DECISION.md**  
   - This file: dependency map, recommendation, and record of change.

---

## D. Redirects and route-entry changes

- **Redirect:** Command Center → Strength section → "Log" button now navigates to `/(app)/workouts/log` instead of `/(app)/training/strength/log`.
- **Route:** `training/strength/log` remains in the stack and on disk; no direct user-facing entry from main nav. Reachable only via direct URL/deep link or future debug/settings entry if added.

---

## E. What remains unresolved

- Journal → backend sync for workouts/log (out of scope for 13.1).
- Whether to expose training/strength/log from debug/settings for backfill (optional follow-up).
- History screen link and exercise-history implementation (out of scope).

---

## F. Test impact

- No tests reference Command Center Strength `onPressLog` or `training/strength/log` route.
- exercise-picker tests assert `pathname: "/(app)/workouts/log"` (unchanged).
- workout-log-session tests cover workouts/log (unchanged).
- **No test file changes required.**

---

## G. Gate results

- **npm run typecheck:** ✅ Pass (exit 0).
- **npm run lint:** ✅ Pass (exit 0).
- **npm test:** ✅ Pass (101 suites, 480 tests; run with network for Firestore emulator).
- **npm run check:invariants:** ✅ Pass (all CHECKs 1–22 + client trust boundary).
