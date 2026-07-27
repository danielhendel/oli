/**
 * Dash Phase 2F-C2 — Sleep Balance detail experience.
 *
 * When enabled, tapping Sleep balance opens the enriched contributor-score detail sheet.
 * When disabled, the row uses the legacy readiness route
 * (`/(app)/recovery/readiness?contributor=sleep-balance`).
 *
 * Default ENABLED. `"0"` → legacy route. unset / `"1"` / other → enabled.
 * Independent of other Readiness contributor detail flags and Sleep Duration.
 * Non-secret. Bundle-time.
 * Tests may call {@link setSleepBalanceDetailV1EnabledForTests}.
 */

export const SLEEP_BALANCE_DETAIL_V1_ENV_KEY = "EXPO_PUBLIC_SLEEP_BALANCE_DETAIL_V1" as const;

export const SLEEP_BALANCE_DETAIL_V1_FLAG_ID = "sleepBalanceDetailV1" as const;

let testOverride: boolean | null = null;

export function setSleepBalanceDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isSleepBalanceDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[SLEEP_BALANCE_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
