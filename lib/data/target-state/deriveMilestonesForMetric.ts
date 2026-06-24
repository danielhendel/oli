// lib/data/target-state/deriveMilestonesForMetric.ts
import { classificationLabelForLevel } from "@/lib/data/target-state/deriveNextLevel";
import type { TargetMilestone, TargetMetricDataStatus } from "@/lib/data/target-state/types";
import { TARGET_TIME_HORIZONS } from "@/lib/data/target-state/types";
import type { ClassificationLevel, ClassificationMetric } from "@/lib/classifications/types";
import { CLASSIFICATION_LEVEL_NAMES } from "@/lib/classifications/types";

export type MilestoneDerivationInput = {
  definition: ClassificationMetric;
  dataStatus: TargetMetricDataStatus;
  currentLevel: ClassificationLevel | null;
  nextLevel: ClassificationLevel | null;
  nextClassification: string | null;
  optimalClassification: string;
};

function milestone(
  horizon: TargetMilestone["horizon"],
  targetLevel: ClassificationLevel | null,
  classificationLabel: string,
  description: string,
): TargetMilestone {
  return { horizon, targetLevel, classificationLabel, description };
}

/**
 * Derives horizon milestones from classification state — target-state language only.
 */
export function deriveMilestonesForMetric(input: MilestoneDerivationInput): TargetMilestone[] {
  const { definition, dataStatus, currentLevel, nextLevel, nextClassification, optimalClassification } =
    input;
  const label = definition.displayName;

  if (dataStatus === "unavailable") {
    return TARGET_TIME_HORIZONS.map((horizon) =>
      milestone(
        horizon,
        null,
        "Data unavailable",
        `Establish measurable baseline for ${label} before setting classification targets.`,
      ),
    );
  }

  if (dataStatus === "maintain-optimal" || currentLevel === 5 || nextLevel == null) {
    return TARGET_TIME_HORIZONS.map((horizon) =>
      milestone(
        horizon,
        5,
        CLASSIFICATION_LEVEL_NAMES[5],
        `Maintain Level 5 (Optimal) ${label} classification within the evidence-based optimal range.`,
      ),
    );
  }

  const level3 = classificationLabelForLevel(3);
  const level4 = classificationLabelForLevel(4);

  return [
    milestone(
      "oneWeek",
      currentLevel,
      input.nextClassification ?? level3,
      `Build awareness of current Level ${currentLevel} ${label} classification.`,
    ),
    milestone(
      "oneMonth",
      nextLevel,
      nextClassification ?? level3,
      `Stabilize measurement and orient toward Level ${nextLevel} ${label} classification.`,
    ),
    milestone(
      "threeMonths",
      nextLevel,
      nextClassification ?? level3,
      `Realistic movement from Level ${currentLevel} toward Level ${nextLevel} ${label} classification where supported by data.`,
    ),
    milestone(
      "oneYear",
      Math.min(nextLevel + 1, 4) as ClassificationLevel,
      level4,
      `Target ${level4} or better ${label} classification on the evidence-based scale.`,
    ),
    milestone(
      "fiveYears",
      4,
      level4,
      `Maintain or progress toward durable ${level4} ${label} classification for healthspan.`,
    ),
    milestone(
      "tenYears",
      5,
      optimalClassification,
      `Maintain Level 5 (Optimal) ${label} classification within the long-term optimal range.`,
    ),
  ];
}
