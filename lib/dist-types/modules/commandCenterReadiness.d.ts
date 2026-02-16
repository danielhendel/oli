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
export declare function isModuleDisabled(id: CommandCenterModuleId, dataState: CommandCenterDataReadinessState): boolean;
export declare function getModuleBadge(id: CommandCenterModuleId, dataState: CommandCenterDataReadinessState): string | undefined;
//# sourceMappingURL=commandCenterReadiness.d.ts.map