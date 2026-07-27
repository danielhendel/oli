/**
 * Dash Phase 2F-C2 — HRV Balance detail experience.
 *
 * When enabled, tapping HRV balance opens the enriched contributor-score detail sheet.
 * When disabled, the row uses the legacy readiness route
 * (`/(app)/recovery/readiness?contributor=hrv-balance`).
 *
 * Convention mirrors Resting Heart Rate / Sleep detail: typed helper with env kill-switch.
 * Default ENABLED.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_HRV_BALANCE_DETAIL_V1 === "0"` → disabled
 * - `process.env.EXPO_PUBLIC_HRV_BALANCE_DETAIL_V1 === "1"` → enabled
 * - unset / any other string → enabled
 *
 * Non-secret. Bundle-time; requires Metro reload / EAS Update / binary to change.
 * Tests may call {@link setHrvBalanceDetailV1EnabledForTests}.
 */

export const HRV_BALANCE_DETAIL_V1_ENV_KEY = "EXPO_PUBLIC_HRV_BALANCE_DETAIL_V1" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const HRV_BALANCE_DETAIL_V1_FLAG_ID = "hrvBalanceDetailV1" as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setHrvBalanceDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isHrvBalanceDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[HRV_BALANCE_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
