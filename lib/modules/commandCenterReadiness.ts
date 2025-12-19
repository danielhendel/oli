import type { CommandCenterModuleId } from "./commandCenterModules";

/**
 * Step 6 contract:
 * - Disabled state is computed here (not stored on module objects)
 * - Badge is computed here (not stored on module objects)
 *
 * Later we’ll replace this with real data readiness logic.
 */

export type ModuleBadge = "Ready" | "Soon" | "Connect" | "Empty";

export function isModuleDisabled(id: CommandCenterModuleId): boolean {
  // Conservative defaults for MVP shell:
  // allow main shells, mark future modules disabled
  return id === "recovery" || id === "labs";
}

export function getModuleBadge(id: CommandCenterModuleId): string | undefined {
  // Optional badge label (omit when undefined)
  if (id === "recovery" || id === "labs") return "Soon";
  return "Ready";
}
