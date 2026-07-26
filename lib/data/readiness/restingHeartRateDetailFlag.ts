/**
 * Dash Phase 2F-B — Resting Heart Rate detail experience.
 *
 * When enabled, tapping Resting heart rate on the Daily Monitor Readiness card opens the
 * enriched personal-range detail sheet. When disabled, the row uses the legacy readiness
 * contributor route (`/(app)/recovery/readiness?contributor=resting-heart-rate`).
 *
 * Convention mirrors Sleep Duration / Efficiency detail: typed helper with env kill-switch.
 * Default ENABLED.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_RESTING_HEART_RATE_DETAIL_V1 === "0"` → disabled
 * - `process.env.EXPO_PUBLIC_RESTING_HEART_RATE_DETAIL_V1 === "1"` → enabled
 * - unset / any other string → enabled
 *
 * Non-secret. Bundle-time; requires Metro reload / EAS Update / binary to change.
 * Tests may call {@link setRestingHeartRateDetailV1EnabledForTests}.
 */

export const RESTING_HEART_RATE_DETAIL_V1_ENV_KEY =
  "EXPO_PUBLIC_RESTING_HEART_RATE_DETAIL_V1" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const RESTING_HEART_RATE_DETAIL_V1_FLAG_ID = "restingHeartRateDetailV1" as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setRestingHeartRateDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isRestingHeartRateDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
