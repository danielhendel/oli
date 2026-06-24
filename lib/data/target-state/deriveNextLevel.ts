// lib/data/target-state/deriveNextLevel.ts
import type { ClassificationLevel } from "@/lib/classifications/types";
import { CLASSIFICATION_LEVEL_NAMES } from "@/lib/classifications/types";

/**
 * Next better classification level. Level 5 (Optimal) has no higher target — returns null (maintain).
 */
export function deriveNextLevel(currentLevel: ClassificationLevel): ClassificationLevel | null {
  if (currentLevel >= 5) return null;
  return (currentLevel + 1) as ClassificationLevel;
}

export function classificationLabelForLevel(level: ClassificationLevel): string {
  return CLASSIFICATION_LEVEL_NAMES[level];
}
