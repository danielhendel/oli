// lib/modules/moduleReadiness.ts

import type { ModuleSectionId } from "@/lib/modules/moduleSectionRoutes";

export type ReadinessStatus = "ready" | "empty" | "locked" | "loading";

export type SectionReadiness = {
  status: ReadinessStatus;
  disabled: boolean;
  badge?: string;
  subtitle?: string;
};

/**
 * Sprint 6 Step 4: Central readiness contract.
 * Replace these with real data checks later.
 */
const READINESS_BY_SECTION: Record<ModuleSectionId, SectionReadiness> = {
  // BODY
  "body.overview": { status: "empty", disabled: false, badge: "0", subtitle: "No entries yet" },
  "body.weight": { status: "empty", disabled: false, badge: "0", subtitle: "Log your first weigh-in" },
  "body.dexa": { status: "locked", disabled: true, badge: "Soon", subtitle: "DEXA uploads coming soon" },

  // WORKOUTS
  "workouts.overview": { status: "empty", disabled: false, badge: "0", subtitle: "No workouts logged" },
  "workouts.log": { status: "ready", disabled: false, badge: "New", subtitle: "Log a workout" },
  "workouts.history": { status: "empty", disabled: false, badge: "0", subtitle: "History will appear here" },

  // NUTRITION
  "nutrition.overview": { status: "empty", disabled: false, badge: "0", subtitle: "No days logged" },
  "nutrition.log": { status: "ready", disabled: false, badge: "New", subtitle: "Log food & macros" },
  "nutrition.targets": { status: "ready", disabled: false, badge: "Set", subtitle: "Set macro targets" },

  // RECOVERY
  "recovery.overview": { status: "locked", disabled: true, badge: "Soon", subtitle: "Recovery module in progress" },
  "recovery.sleep": { status: "locked", disabled: true, badge: "Soon", subtitle: "Sleep tracking coming soon" },
  "recovery.readiness": { status: "locked", disabled: true, badge: "Soon", subtitle: "Readiness scoring coming soon" },

  // LABS
  "labs.overview": { status: "locked", disabled: true, badge: "Soon", subtitle: "Labs module in progress" },
  "labs.upload": { status: "locked", disabled: true, badge: "Soon", subtitle: "Upload labs coming soon" },
  "labs.biomarkers": { status: "locked", disabled: true, badge: "Soon", subtitle: "Biomarker insights coming soon" },

  // SETTINGS
  "settings.account": { status: "ready", disabled: false, subtitle: "Profile & auth" },
  "settings.devices": { status: "locked", disabled: true, badge: "Soon", subtitle: "Device connections coming soon" },
  "settings.privacy": { status: "ready", disabled: false, subtitle: "Data controls & permissions" },
};

export function getSectionReadiness(sectionId: ModuleSectionId): SectionReadiness {
  return READINESS_BY_SECTION[sectionId];
}
