// lib/modules/moduleSectionRoutes.ts

export type ModuleId = "body" | "workouts" | "nutrition" | "recovery" | "labs" | "settings";

export type ModuleSection = {
  id: string; // refined to ModuleSectionId via `as const` below
  moduleId: ModuleId;
  title: string;
  href: string;
};

export const MODULE_SECTIONS = [
  // BODY
  { id: "body.overview", moduleId: "body", title: "Overview", href: "/(app)/body/overview" },
  { id: "body.weight", moduleId: "body", title: "Weight", href: "/(app)/body/weight" },
  { id: "body.dexa", moduleId: "body", title: "DEXA", href: "/(app)/body/dexa" },

  // WORKOUTS
  { id: "workouts.overview", moduleId: "workouts", title: "Overview", href: "/(app)/workouts/overview" },
  { id: "workouts.log", moduleId: "workouts", title: "Log Workout", href: "/(app)/workouts/log" },
  { id: "workouts.history", moduleId: "workouts", title: "History", href: "/(app)/workouts/history" },

  // NUTRITION
  { id: "nutrition.overview", moduleId: "nutrition", title: "Overview", href: "/(app)/nutrition/overview" },
  { id: "nutrition.log", moduleId: "nutrition", title: "Log Nutrition", href: "/(app)/nutrition/log" },
  { id: "nutrition.targets", moduleId: "nutrition", title: "Targets", href: "/(app)/nutrition/targets" },

  // RECOVERY
  { id: "recovery.overview", moduleId: "recovery", title: "Overview", href: "/(app)/recovery/overview" },
  { id: "recovery.sleep", moduleId: "recovery", title: "Sleep", href: "/(app)/recovery/sleep" },
  { id: "recovery.readiness", moduleId: "recovery", title: "Readiness", href: "/(app)/recovery/readiness" },

  // LABS
  { id: "labs.overview", moduleId: "labs", title: "Overview", href: "/(app)/labs/overview" },
  { id: "labs.biomarkers", moduleId: "labs", title: "Biomarkers", href: "/(app)/labs/biomarkers" },
  { id: "labs.log", moduleId: "labs", title: "Log biomarkers", href: "/(app)/labs/log" },
  { id: "labs.upload", moduleId: "labs", title: "Upload", href: "/(app)/labs/upload" },

  // SETTINGS
  { id: "settings.account", moduleId: "settings", title: "Account", href: "/(app)/settings/account" },
  { id: "settings.units", moduleId: "settings", title: "Units", href: "/(app)/settings/units" },
  { id: "settings.devices", moduleId: "settings", title: "Devices", href: "/(app)/settings/devices" },
  { id: "settings.privacy", moduleId: "settings", title: "Privacy", href: "/(app)/settings/privacy" },
] as const satisfies readonly ModuleSection[];

// ✅ Strong union of all section IDs
export type ModuleSectionId = (typeof MODULE_SECTIONS)[number]["id"];

// ✅ Typed section object
export type ModuleSectionRoute = (typeof MODULE_SECTIONS)[number];

// ✅ Helper: sections for a module
export function getModuleSections(moduleId: ModuleId): ModuleSectionRoute[] {
  return MODULE_SECTIONS.filter((s) => s.moduleId === moduleId);
}

// ✅ Helper: find a section by id
export function getSectionById(id: ModuleSectionId): ModuleSectionRoute | undefined {
  return MODULE_SECTIONS.find((s) => s.id === id);
}
