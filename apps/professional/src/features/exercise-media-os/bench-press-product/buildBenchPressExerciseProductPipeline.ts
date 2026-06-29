import { buildBenchPressPilotMasterMediaPackage } from "../data/benchPressMasterMediaPackage";

import {
  BENCH_PRESS_ASSET_STATUS,
  BENCH_PRESS_PRODUCT_EXERCISE_ID,
  BENCH_PRESS_PRODUCT_VERSION,
} from "./benchPressProductConstants";
import { buildBenchPressExpertMediaQAChecklist } from "./buildBenchPressExpertMediaQAChecklist";
import { buildBenchPressMediaStoryboard } from "./buildBenchPressMediaStoryboard";
import { buildBenchPressProductionBrief } from "./buildBenchPressProductionBrief";
import type { BenchPressExerciseProductPipeline, BenchPressTimelineCompatibility } from "./types";

function validateTimelineCompatibility(
  mediaPackageVersion: string,
  storyboardSceneCount: number,
  storyboardSlotIds: string[],
  storyboardDuration: number,
  packageSlotIds: string[],
  packageDuration: number,
): BenchPressTimelineCompatibility {
  const sceneCountMatches = storyboardSceneCount === packageSlotIds.length;
  const slotIdsMatch =
    storyboardSlotIds.length === packageSlotIds.length &&
    storyboardSlotIds.every((id, index) => id === packageSlotIds[index]);
  const totalDurationMatches = storyboardDuration === packageDuration;

  return {
    sceneCountMatches,
    slotIdsMatch,
    totalDurationMatches,
    passes: sceneCountMatches && slotIdsMatch && totalDurationMatches,
  };
}

/** Build the complete Bench Press Exercise Product pipeline. */
export function buildBenchPressExerciseProductPipeline(): BenchPressExerciseProductPipeline {
  const mediaPackage = buildBenchPressPilotMasterMediaPackage();
  const storyboard = buildBenchPressMediaStoryboard({ mediaPackage });
  const productionBrief = buildBenchPressProductionBrief(storyboard);
  const qaChecklist = buildBenchPressExpertMediaQAChecklist(storyboard, productionBrief);

  const packageSlotIds = mediaPackage.slots
    .filter((slot) => storyboard.scenes.some((scene) => scene.slotType === slot.slotType))
    .sort(
      (a, b) =>
        storyboard.scenes.findIndex((scene) => scene.slotType === a.slotType) -
        storyboard.scenes.findIndex((scene) => scene.slotType === b.slotType),
    )
    .map((slot) => slot.slotId);

  const timelineCompatibility = validateTimelineCompatibility(
    mediaPackage.packageVersion,
    storyboard.scenes.length,
    storyboard.scenes.map((scene) => scene.slotId),
    storyboard.totalDurationSeconds,
    packageSlotIds,
    mediaPackage.estimatedDurationSeconds,
  );

  return {
    exerciseId: BENCH_PRESS_PRODUCT_EXERCISE_ID,
    productVersion: BENCH_PRESS_PRODUCT_VERSION,
    storyboard,
    productionBrief,
    qaChecklist,
    mediaPackageVersion: mediaPackage.packageVersion,
    timelineCompatibility,
    assetStatus: BENCH_PRESS_ASSET_STATUS,
  };
}

export { isBenchPressProductExercise } from "./benchPressProductConstants";
