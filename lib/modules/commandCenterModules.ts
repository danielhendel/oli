// lib/modules/commandCenterModules.ts

export type CommandCenterModuleId =
  | "body"
  | "training"
  | "nutrition"
  | "recovery"
  | "labs"
  | "settings";

export type CommandCenterModuleStatus = "active" | "coming_soon" | "disabled";

export type CommandCenterModule = {
  id: CommandCenterModuleId;
  title: string;
  subtitle?: string;
  href: string; // Expo Router path
  status: CommandCenterModuleStatus;
};

export const COMMAND_CENTER_MODULES: readonly CommandCenterModule[] = [
  {
    id: "body",
    title: "Body",
    subtitle: "Weight, DEXA, composition",
    href: "/(app)/body",
    status: "active",
  },
  {
    id: "training",
    title: "Training",
    subtitle: "Strength & cardio",
    href: "/(app)/workouts",
    status: "active",
  },
  {
    id: "nutrition",
    title: "Nutrition",
    subtitle: "Macros & micros",
    href: "/(app)/nutrition",
    status: "active",
  },
  {
    id: "recovery",
    title: "Recovery",
    subtitle: "Sleep & readiness",
    href: "/(app)/recovery",
    status: "coming_soon",
  },
  {
    id: "labs",
    title: "Labs",
    subtitle: "Bloodwork & biomarkers",
    href: "/(app)/labs",
    status: "coming_soon",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "App preferences",
    href: "/(app)/settings",
    status: "active",
  },
] as const;

export function isModuleDisabled(m: CommandCenterModule): boolean {
  return m.status !== "active";
}
