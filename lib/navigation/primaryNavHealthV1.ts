/**
 * Phase 2G-A — Health-focused primary bottom navigation.
 *
 * When enabled, the primary dock shows Dash / Strength / Cardio / Nutrition / Health
 * and the dock menu is health-only. When disabled, the legacy four-tab dock + Manage
 * menu remain.
 *
 * Convention mirrors `isDashDailyMonitorFoundationEnabled`: typed helper with an
 * env kill-switch / force-enable override. Default is ENABLED.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 === "0"` → disabled (legacy)
 * - `process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 === "1"` → enabled
 * - unset / any other string → enabled (same as default / `"1"`)
 *
 * Non-secret. Value is embedded when Metro/EAS builds the JS bundle; changing
 * it requires a cleared Metro reload or a new EAS Update / binary — it is not a
 * server-side remote kill switch by itself. Documented in `.env.example`.
 *
 * Tests may call {@link setPrimaryNavHealthV1EnabledForTests}.
 */

export const PRIMARY_NAV_HEALTH_V1_ENV_KEY = "EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const PRIMARY_NAV_HEALTH_V1_FLAG_ID = "primaryNavHealthV1" as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setPrimaryNavHealthV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isPrimaryNavHealthV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[PRIMARY_NAV_HEALTH_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
