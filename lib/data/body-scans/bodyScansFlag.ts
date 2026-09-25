/**
 * Stage 3E — Body Scans feature flag.
 *
 * Gates the Body Scans UI only. The API stays authorization-protected regardless of
 * the flag; the flag must never be the sole access control.
 *
 * `EXPO_PUBLIC_BODY_SCANS_V1`:
 * - "1" → enabled
 * - "0" → disabled
 * - unset → enabled in development, disabled otherwise
 *
 * Production stays disabled until the Stage 3E release blockers close
 * (see `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md` §13).
 */

export const BODY_SCANS_V1_ENV_KEY = "EXPO_PUBLIC_BODY_SCANS_V1" as const;

export const BODY_SCANS_V1_FLAG_ID = "bodyScans" as const;

let testOverride: boolean | null = null;

export function setBodyScansV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isBodyScansV1Enabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (testOverride != null) return testOverride;
  const override = env[BODY_SCANS_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return env.NODE_ENV === "development";
}
