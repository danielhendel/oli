/**
 * Dash Phase 1 — relocate the Weekly Fitness experience from Dash to Program
 * as consumer-titled “Weekly Progress”.
 *
 * Convention mirrors `shouldEnableWorkoutPhysiologyV1`: typed helper with an
 * env kill-switch / force-enable override. Default is ENABLED so Phase 1 lands
 * on Program; set the override to `"0"` to restore Dash placement (rollback).
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_DASH_WEEKLY_PROGRESS_RELOCATION === "0"` → disabled
 * - `process.env.EXPO_PUBLIC_DASH_WEEKLY_PROGRESS_RELOCATION === "1"` → enabled
 * - unset / any other string → enabled (same as default / `"1"`)
 *
 * Non-secret. Value is embedded when Metro/EAS builds the JS bundle; changing
 * it requires a cleared Metro reload or a new EAS Update / binary — it is not a
 * server-side remote kill switch by itself. Documented in `.env.example`.
 *
 * Tests may call {@link setDashWeeklyProgressRelocationEnabledForTests}.
 */

export const DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY =
  "EXPO_PUBLIC_DASH_WEEKLY_PROGRESS_RELOCATION" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const DASH_WEEKLY_PROGRESS_RELOCATION_FLAG_ID =
  "dashWeeklyProgressRelocation" as const;

/** Consumer-visible title when the card is mounted under Program. */
export const WEEKLY_PROGRESS_CONSUMER_TITLE = "Weekly Progress" as const;

/** Consumer-visible title when the card remains on Dash (rollback path). */
export const WEEKLY_FITNESS_CONSUMER_TITLE = "Weekly Fitness" as const;

/** Supporting copy under Program — weekly targets, not active-program adherence. */
export const WEEKLY_PROGRESS_SUPPORTING_COPY =
  "Progress against this week’s fitness targets." as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setDashWeeklyProgressRelocationEnabledForTests(
  enabled: boolean | null,
): void {
  testOverride = enabled;
}

export function isDashWeeklyProgressRelocationEnabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
