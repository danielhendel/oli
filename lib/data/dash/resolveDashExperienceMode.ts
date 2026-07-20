/**
 * Pure Dash experience-mode resolver (Phase 2C).
 *
 * Daily Monitor is valid only when Weekly Progress relocation is also enabled.
 * When Daily Monitor is ON but relocation is OFF, fall back to legacy Dash so
 * Weekly Fitness and Daily Monitor never hybridize.
 */

import { isDashDailyMonitorFoundationEnabled } from "@/lib/data/dash/dashDailyMonitorFoundation";
import { isDashWeeklyProgressRelocationEnabled } from "@/lib/data/dash/dashWeeklyProgressRelocation";

export type DashExperienceMode = "daily_monitor" | "legacy_dash";

export type DashExperienceModeInput = {
  dailyMonitorEnabled: boolean;
  weeklyProgressRelocationEnabled: boolean;
};

/**
 * Deterministic matrix:
 * 1. Monitor ON + relocation ON → daily_monitor
 * 2. Monitor OFF + relocation ON → legacy_dash (post–Phase 1)
 * 3. Monitor OFF + relocation OFF → legacy_dash (Weekly Fitness on Dash)
 * 4. Monitor ON + relocation OFF → legacy_dash (no hybrid)
 */
export function resolveDashExperienceMode(
  input: DashExperienceModeInput,
): DashExperienceMode {
  if (input.dailyMonitorEnabled && input.weeklyProgressRelocationEnabled) {
    return "daily_monitor";
  }
  return "legacy_dash";
}

/** Reads current env/test overrides and resolves the active experience. */
export function resolveDashExperienceModeFromFlags(): DashExperienceMode {
  return resolveDashExperienceMode({
    dailyMonitorEnabled: isDashDailyMonitorFoundationEnabled(),
    weeklyProgressRelocationEnabled: isDashWeeklyProgressRelocationEnabled(),
  });
}
