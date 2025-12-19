// lib/modules/commandCenterReadiness.ts

export type ModuleReadiness = "available" | "needsSetup" | "locked" | "comingSoon";

export function isModuleNavigable(readiness: ModuleReadiness): boolean {
  return readiness === "available" || readiness === "needsSetup";
}

export function isModuleDisabledByReadiness(readiness: ModuleReadiness): boolean {
  return !isModuleNavigable(readiness);
}

/**
 * Sprint 5 Step 3:
 * Readiness is stubbed + deterministic for now.
 *
 * Later (Sprint 6+), replace this with real logic:
 * - auth state
 * - profile completeness
 * - data availability (events/facts)
 * - feature flags / remote config
 */
export function getModuleReadiness(moduleId: string): ModuleReadiness {
  switch (moduleId) {
    case "body":
    case "training":
    case "nutrition":
    case "settings":
      return "available";

    case "recovery":
      return "comingSoon";

    case "labs":
      return "locked";

    default:
      // Safe default: don't block dev navigation unintentionally
      return "available";
  }
}

export function getReadinessBadge(readiness: ModuleReadiness): string | undefined {
  switch (readiness) {
    case "needsSetup":
      return "SET UP";
    case "comingSoon":
      return "SOON";
    case "locked":
      return "LOCKED";
    case "available":
    default:
      return undefined;
  }
}
