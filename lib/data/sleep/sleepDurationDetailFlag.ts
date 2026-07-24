/**
 * Dash Phase 2D — Sleep Duration detail experience (pilot).
 *
 * When enabled, tapping Duration on the Daily Sleep / Monitor Sleep card opens the
 * enriched Duration detail sheet (reference range, 7d/30d averages). When disabled,
 * Duration uses the legacy MetricDetailsSheet explainer.
 *
 * Convention mirrors `isDashDailyMonitorFoundationEnabled`: typed helper with an
 * env kill-switch / force-enable override. Default is ENABLED.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_SLEEP_DURATION_DETAIL_V1 === "0"` → disabled
 * - `process.env.EXPO_PUBLIC_SLEEP_DURATION_DETAIL_V1 === "1"` → enabled
 * - unset / any other string → enabled (same as default / `"1"`)
 *
 * Non-secret. Value is embedded when Metro/EAS builds the JS bundle; changing
 * it requires a cleared Metro reload or a new EAS Update / binary — it is not a
 * server-side remote kill switch by itself. Documented in `.env.example`.
 *
 * Tests may call {@link setSleepDurationDetailV1EnabledForTests}.
 */

export const SLEEP_DURATION_DETAIL_V1_ENV_KEY = "EXPO_PUBLIC_SLEEP_DURATION_DETAIL_V1" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const SLEEP_DURATION_DETAIL_V1_FLAG_ID = "sleepDurationDetailV1" as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setSleepDurationDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isSleepDurationDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
