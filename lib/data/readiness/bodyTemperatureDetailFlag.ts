/**
 * Dash Phase 2F-C2 — Body Temperature detail experience.
 *
 * When enabled, tapping Body temperature opens the enriched contributor-score detail sheet.
 * When disabled, the row uses the legacy readiness route
 * (`/(app)/recovery/readiness?contributor=body-temperature`).
 *
 * Default ENABLED. `"0"` → legacy route. unset / `"1"` / other → enabled.
 * Independent of other Readiness contributor detail flags.
 * Non-secret. Bundle-time.
 * Tests may call {@link setBodyTemperatureDetailV1EnabledForTests}.
 */

export const BODY_TEMPERATURE_DETAIL_V1_ENV_KEY =
  "EXPO_PUBLIC_BODY_TEMPERATURE_DETAIL_V1" as const;

export const BODY_TEMPERATURE_DETAIL_V1_FLAG_ID = "bodyTemperatureDetailV1" as const;

let testOverride: boolean | null = null;

export function setBodyTemperatureDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isBodyTemperatureDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[BODY_TEMPERATURE_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
