import { buildClientMediaTimeline } from "./buildClientMediaTimeline";
import { mergeMediaComposerState } from "./buildMediaComposerState";
import { resolveMasterMediaPackage } from "./buildMasterMediaPackage";
import { buildExerciseMediaBlueprint } from "./buildExerciseMediaBlueprint";
import {
  BENCH_PRESS_BRIEF_VERSION,
  BENCH_PRESS_PRODUCT_VERSION,
  BENCH_PRESS_QA_VERSION,
  isBenchPressProductExercise,
} from "./bench-press-product/benchPressProductConstants";
import { BENCH_PRESS_MEDIA_ASSET_MANIFEST_VERSION } from "./data/benchPressMediaAssets";
import {
  countApprovedPlayableVideoAssets,
  listExerciseMediaAssets,
} from "./mediaAssetRegistry";
import {
  EXERCISE_MEDIA_BLUEPRINT_VERSION,
  type ExerciseMediaExperiencePayloadRef,
  type MediaComposerState,
} from "./types";

function resolvePayloadAssetStatus(
  exerciseId: string,
): ExerciseMediaExperiencePayloadRef["assetStatus"] {
  const assets = listExerciseMediaAssets(exerciseId);
  const approved = countApprovedPlayableVideoAssets(exerciseId);
  if (approved <= 0) return "placeholder-only";
  if (approved >= assets.length && assets.length > 0) return "real-assets";
  return "partial-assets";
}

export function buildMediaExperiencePayloadRef(input: {
  exerciseId: string;
  exerciseName: string;
  composer?: MediaComposerState;
}): ExerciseMediaExperiencePayloadRef {
  const mediaPackage = resolveMasterMediaPackage(
    buildExerciseMediaBlueprint({
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
    }),
  );
  const composer = input.composer ?? mergeMediaComposerState(input.exerciseId);
  const timeline = buildClientMediaTimeline(mediaPackage, composer);

  return {
    mediaBlueprintVersion: EXERCISE_MEDIA_BLUEPRINT_VERSION,
    masterPackageVersion: mediaPackage.packageVersion,
    selectedTeachingStyle: composer.selectedTeachingStyle,
    selectedDifficulty: composer.selectedDifficulty,
    selectedTodayFocus: composer.selectedTodayFocus,
    selectedVisualEmphasis: composer.selectedVisualEmphasis,
    hasCoachMessage: composer.coachMessage.trim().length > 0,
    timelineItemCount: timeline.items.length,
    estimatedDurationSeconds: timeline.totalDurationSeconds,
    ...(isBenchPressProductExercise(input.exerciseId)
      ? {
          exerciseProductVersion: BENCH_PRESS_PRODUCT_VERSION,
          productionBriefVersion: BENCH_PRESS_BRIEF_VERSION,
          qaVersion: BENCH_PRESS_QA_VERSION,
          assetStatus: resolvePayloadAssetStatus(input.exerciseId),
          mediaAssetManifestVersion: BENCH_PRESS_MEDIA_ASSET_MANIFEST_VERSION,
          approvedVideoAssetCount: countApprovedPlayableVideoAssets(input.exerciseId),
        }
      : {}),
  };
}
