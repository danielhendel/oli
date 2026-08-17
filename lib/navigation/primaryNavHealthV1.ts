/**
 * DEPRECATED — do not use to choose production primary navigation.
 *
 * R1 establishes a single production IA: Home · Plan · Progress · You.
 * `EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1` no longer restores the superseded
 * Dash / Strength / Cardio / Nutrition / Health dock, the legacy
 * Dash / Timeline / Program / Library dock, or a Health/Manage FAB.
 *
 * The helper remains only so existing tests can observe the historical env
 * parse. Application chrome must not branch on it.
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

/**
 * Historical env parse. Not a production navigation switch.
 */
export function isPrimaryNavHealthV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[PRIMARY_NAV_HEALTH_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
