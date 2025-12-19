// lib/modules/commandCenterReadiness.ts
import type { CommandCenterModule, CommandCenterModuleId } from "./commandCenterModules";

export type ModuleReadiness = {
  disabled: boolean;
  badge?: "SOON" | "LOCKED";
};

/**
 * Central place to control which modules are clickable + what badge they show.
 * Keeps module definitions (title/subtitle/href) clean and stable.
 */
export function getModuleReadiness(id: CommandCenterModuleId): ModuleReadiness {
  switch (id) {
    case "recovery":
      return { disabled: true, badge: "SOON" };
    case "labs":
      return { disabled: true, badge: "LOCKED" };
    default:
      return { disabled: false };
  }
}

/** Convenience helper if you prefer passing the module object around. */
export function isModuleDisabled(module: CommandCenterModule): boolean {
  return getModuleReadiness(module.id).disabled;
}
