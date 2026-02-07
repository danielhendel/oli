// lib/modules/moduleReadiness.ts
import type { ModuleSectionId } from "@/lib/modules/moduleSectionRoutes";

export type ReadinessStatus = "ready" | "coming_soon";

export type SectionReadiness = {
  status: ReadinessStatus;
  disabled: boolean;
  badge?: string;
};

const READY: SectionReadiness = { status: "ready", disabled: false };
const SOON = (badge = "Soon"): SectionReadiness => ({
  status: "coming_soon",
  disabled: true,
  badge,
});

/**
 * Central readiness resolver for module sections.
 * Keep all "what is live vs soon" logic here.
 */
export function getSectionReadiness(sectionId: ModuleSectionId): SectionReadiness {
  switch (sectionId) {
    // BODY
    case "body.overview":
      return READY;
    case "body.weight":
      return READY;
    case "body.dexa":
      return SOON("Soon");

    // WORKOUTS
    case "workouts.overview":
      return READY;
    case "workouts.log":
      return SOON("Soon");
    case "workouts.history":
      return SOON("Soon");

    // NUTRITION
    case "nutrition.overview":
      return READY;
    case "nutrition.log":
      return SOON("Soon");
    case "nutrition.targets":
      return SOON("Soon");

    // RECOVERY
    case "recovery.overview":
      return SOON("Soon");
    case "recovery.sleep":
      return SOON("Soon");
    case "recovery.readiness":
      return SOON("Soon");

    // LABS
    case "labs.overview":
      return SOON("Soon");
    case "labs.biomarkers":
      return READY;
    case "labs.log":
      return READY;
    case "labs.upload":
      return SOON("Soon");

    // SETTINGS
    case "settings.account":
      return READY;
    case "settings.units":
      return READY;
    case "settings.devices":
      return SOON("Soon");
    case "settings.privacy":
      return READY;

    default:
      // Exhaustiveness safety in case ids evolve
      return SOON("Soon");
  }
}
