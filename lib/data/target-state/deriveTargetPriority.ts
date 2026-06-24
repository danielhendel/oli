// lib/data/target-state/deriveTargetPriority.ts
import type { GoalType } from "@/lib/data/health-assessment/types";
import type { TargetPriority } from "@/lib/data/target-state/types";
import type { ClassificationDomain } from "@/lib/classifications/types";
import { CLASSIFICATION_DOMAINS } from "@/lib/classifications/types";

const FAT_LOSS_ORDER: readonly ClassificationDomain[] = [
  "body-composition",
  "activity",
  "nutrition",
  "recovery",
  "cardio",
  "strength",
  "labs",
];

const MUSCLE_GAIN_ORDER: readonly ClassificationDomain[] = [
  "strength",
  "body-composition",
  "nutrition",
  "recovery",
  "activity",
  "cardio",
  "labs",
];

const LONGEVITY_ORDER: readonly ClassificationDomain[] = [
  "labs",
  "cardio",
  "body-composition",
  "recovery",
  "activity",
  "nutrition",
  "strength",
];

const PERFORMANCE_ORDER: readonly ClassificationDomain[] = [
  "strength",
  "cardio",
  "activity",
  "body-composition",
  "nutrition",
  "recovery",
  "labs",
];

const REHABILITATION_ORDER: readonly ClassificationDomain[] = [
  "recovery",
  "body-composition",
  "strength",
  "nutrition",
  "activity",
  "cardio",
  "labs",
];

function orderForGoal(primaryGoal: GoalType | null): readonly ClassificationDomain[] {
  switch (primaryGoal) {
    case "fat-loss":
    case "body-composition":
      return FAT_LOSS_ORDER;
    case "muscle-gain":
      return MUSCLE_GAIN_ORDER;
    case "longevity":
    case "general-health":
      return LONGEVITY_ORDER;
    case "performance":
      return PERFORMANCE_ORDER;
    case "rehabilitation":
      return REHABILITATION_ORDER;
    default:
      return LONGEVITY_ORDER;
  }
}

export function getDomainPriorityOrder(primaryGoal: GoalType | null): ClassificationDomain[] {
  const order = orderForGoal(primaryGoal);
  const missing = CLASSIFICATION_DOMAINS.filter((d) => !order.includes(d));
  return [...order, ...missing];
}

export function deriveTargetPriority(
  primaryGoal: GoalType | null,
  domain: ClassificationDomain,
): TargetPriority {
  const order = getDomainPriorityOrder(primaryGoal);
  const index = order.indexOf(domain);
  const rank = index >= 0 ? index + 1 : 7;
  return rank as TargetPriority;
}
