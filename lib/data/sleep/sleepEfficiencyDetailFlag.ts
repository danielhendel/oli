/**
 * Dash Phase 2E-D — Sleep Efficiency detail experience.
 *
 * When enabled, tapping Sleep efficiency on the Daily Sleep / Monitor Sleep card opens the
 * enriched Sleep Efficiency detail sheet. When disabled, Efficiency uses the legacy MetricDetailsSheet.
 *
 * Convention mirrors Duration / Deep / REM detail: typed helper with env kill-switch. Default ENABLED.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_SLEEP_EFFICIENCY_DETAIL_V1 === "0"` → disabled
 * - `process.env.EXPO_PUBLIC_SLEEP_EFFICIENCY_DETAIL_V1 === "1"` → enabled
 * - unset / any other string → enabled
 *
 * Non-secret. Bundle-time; requires Metro reload / EAS Update / binary to change.
 * Tests may call {@link setSleepEfficiencyDetailV1EnabledForTests}.
 */

export const SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY =
  "EXPO_PUBLIC_SLEEP_EFFICIENCY_DETAIL_V1" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const SLEEP_EFFICIENCY_DETAIL_V1_FLAG_ID = "sleepEfficiencyDetailV1" as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setSleepEfficiencyDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isSleepEfficiencyDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
