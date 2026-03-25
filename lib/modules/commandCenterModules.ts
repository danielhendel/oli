// lib/modules/commandCenterModules.ts

export type CommandCenterModuleId =
  | "body"
  | "training"
  | "cardio"
  | "nutrition"
  | "recovery"
  | "labs"
  | "settings";

export type CommandCenterModule = {
  id: CommandCenterModuleId;
  title: string;
  subtitle?: string;
  href: string;
};

export const COMMAND_CENTER_MODULES: readonly CommandCenterModule[] = [
  {
    id: "body",
    title: "Body",
    subtitle: "Weight, DEXA, composition",
    href: "/(app)/body",
  },
  {
    id: "training",
    title: "Strength",
    subtitle: "Lift & log sessions",
    href: "/(app)/workouts",
  },
  {
    id: "cardio",
    title: "Cardio",
    subtitle: "Runs, rides, and more",
    href: "/(app)/cardio",
  },
  {
    id: "nutrition",
    title: "Nutrition",
    subtitle: "Macros & micros",
    href: "/(app)/nutrition",
  },
  {
    id: "recovery",
    title: "Recovery",
    subtitle: "Sleep & readiness",
    href: "/(app)/recovery",
  },
  {
    id: "labs",
    title: "Labs",
    subtitle: "Bloodwork & biomarkers",
    href: "/(app)/labs",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Account, privacy, devices",
    href: "/(app)/settings",
  },
] as const;
