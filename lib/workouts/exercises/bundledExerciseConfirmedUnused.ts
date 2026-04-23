/**
 * Gate for bundled exercise archival in `library.v1.ts`.
 *
 * Populate **only** after an offline audit that unions:
 * - Firestore `rawEvents` / canonical strength payloads: distinct `exerciseId` (when present)
 * - Legacy logs: distinct names passed through `taxonomyResolve` / `resolveExerciseIntelligenceForAnalytics`
 * - Local journal stores (`listWorkoutJournalSessionIds` → events → `exerciseId`)
 * - Any other verified history export your deployment uses
 *
 * **Never** add ids from guesswork, repo-only string search, or "probably unused" heuristics.
 * After editing this list, set matching rows in `library.v1.ts` to `status: "archived"` (never delete rows).
 *
 * User-specific picker narrowing (e.g. Daniel staging) uses `preferences.workoutPickerBundledAllowlistExerciseIds`
 * instead of global archival.
 */
export const CONFIRMED_UNUSED_BUNDLED_EXERCISE_IDS: readonly string[] = [];
