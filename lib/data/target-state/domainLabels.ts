// lib/data/target-state/domainLabels.ts
import type { ClassificationDomain } from "@/lib/classifications/types";

export const TARGET_STATE_DOMAIN_TITLES: Record<ClassificationDomain, string> = {
  "body-composition": "Body Composition",
  activity: "Activity",
  strength: "Strength",
  cardio: "Cardio",
  nutrition: "Nutrition",
  recovery: "Recovery",
  labs: "Labs",
};

export function getTargetStateDomainTitle(domain: ClassificationDomain): string {
  return TARGET_STATE_DOMAIN_TITLES[domain];
}
