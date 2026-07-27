/**
 * Dash Phase 2F-C2 — Recovery Index detail experience.
 *
 * When enabled, tapping Recovery index opens the enriched contributor-score detail sheet.
 * When disabled, the row uses the legacy readiness route
 * (`/(app)/recovery/readiness?contributor=recovery-index`).
 *
 * Default ENABLED. `"0"` → legacy route. unset / `"1"` / other → enabled.
 * Independent of other Readiness contributor detail flags.
 * Non-secret. Bundle-time.
 * Tests may call {@link setRecoveryIndexDetailV1EnabledForTests}.
 */

export const RECOVERY_INDEX_DETAIL_V1_ENV_KEY =
  "EXPO_PUBLIC_RECOVERY_INDEX_DETAIL_V1" as const;

export const RECOVERY_INDEX_DETAIL_V1_FLAG_ID = "recoveryIndexDetailV1" as const;

let testOverride: boolean | null = null;

export function setRecoveryIndexDetailV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isRecoveryIndexDetailV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[RECOVERY_INDEX_DETAIL_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
