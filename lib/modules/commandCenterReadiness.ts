// lib/modules/commandCenterReadiness.ts
import type { CommandCenterModuleId } from "./commandCenterModules";

/**
 * Phase 1 §4.1 contract:
 * - Disabled state is computed here (not stored on module objects)
 * - Badge is computed here (not stored on module objects)
 * - Fail-closed: when truth is not provably valid, we disable module navigation (except Settings).
 */

/** Phase 1 Lock #3: Canonical readiness vocabulary. */
export type CommandCenterDataReadinessState = "missing" | "partial" | "ready" | "error";

export type ModuleBadge = "Ready" | "Soon" | "Connect" | "Empty";

function badgeForDataState(state: CommandCenterDataReadinessState): string | undefined {
  switch (state) {
    case "partial":
      return "Needs input";
    case "missing":
      return "Empty";
    case "error":
      return "Error";
    case "ready":
      return undefined;
    default:
      return "Error";
  }
}

export function isModuleDisabled(id: CommandCenterModuleId, dataState: CommandCenterDataReadinessState): boolean {
  // Settings must remain accessible (privacy, account deletion, export, etc.)
  if (id === "settings") return false;

  // Phase 1 §4.1: fail-closed gating
  if (dataState !== "ready") return true;

  // Product readiness (feature rollout)
  return id === "recovery" || id === "labs";
}

export function getModuleBadge(id: CommandCenterModuleId, dataState: CommandCenterDataReadinessState): string | undefined {
  // If data isn't ready, surface data status (explains why tiles are locked).
  const dataBadge = badgeForDataState(dataState);
  if (dataBadge) return dataBadge;

  // Data is ready; now show product rollout badges.
  if (id === "recovery" || id === "labs") return "Soon";
  return "Ready";
}