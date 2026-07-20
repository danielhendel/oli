/**
 * Dash Phase 2C — Daily Monitor foundation.
 *
 * When enabled (with Weekly Progress relocation also enabled), the Dash tab
 * presents as the consumer Daily Monitor: current-day evidence only, hybrid
 * sections, and presence-driven cards.
 *
 * Convention mirrors `isDashWeeklyProgressRelocationEnabled`: typed helper with
 * an env kill-switch / force-enable override. Default is ENABLED.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_DASH_DAILY_MONITOR_FOUNDATION === "0"` → disabled
 * - `process.env.EXPO_PUBLIC_DASH_DAILY_MONITOR_FOUNDATION === "1"` → enabled
 * - unset / any other string → enabled (same as default / `"1"`)
 *
 * Non-secret. Value is embedded when Metro/EAS builds the JS bundle; changing
 * it requires a cleared Metro reload or a new EAS Update / binary — it is not a
 * server-side remote kill switch by itself. Documented in `.env.example`.
 *
 * Tests may call {@link setDashDailyMonitorFoundationEnabledForTests}.
 */

export const DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY =
  "EXPO_PUBLIC_DASH_DAILY_MONITOR_FOUNDATION" as const;

/** Conceptual product id; env key is the runtime control surface. */
export const DASH_DAILY_MONITOR_FOUNDATION_FLAG_ID = "dashDailyMonitorFoundation" as const;

/** Consumer-visible screen title when Daily Monitor is active. */
export const DAILY_MONITOR_SCREEN_TITLE = "Daily Monitor" as const;

/** Consumer-visible tab title (width-constrained). */
export const DAILY_MONITOR_TAB_TITLE = "Monitor" as const;

/** Tab accessibility label (full name). */
export const DAILY_MONITOR_TAB_A11Y_LABEL = "Daily Monitor" as const;

/** Legacy Dash screen title when Daily Monitor is inactive. */
export const LEGACY_DASH_SCREEN_TITLE = "Oli Fitness" as const;

let testOverride: boolean | null = null;

/**
 * Test-only override. Pass `null` to clear and fall back to env/default.
 * Production code must not call this.
 */
export function setDashDailyMonitorFoundationEnabledForTests(
  enabled: boolean | null,
): void {
  testOverride = enabled;
}

export function isDashDailyMonitorFoundationEnabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
