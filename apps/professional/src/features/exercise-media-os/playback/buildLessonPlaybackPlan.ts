import type { BenchPressExerciseProductPipeline } from "../bench-press-product/types";
import { BENCH_PRESS_PRODUCT_VERSION } from "../bench-press-product/benchPressProductConstants";
import { isBenchPressProductExercise } from "../bench-press-product/benchPressProductConstants";
import { buildBenchPressExerciseProductPipeline } from "../bench-press-product/buildBenchPressExerciseProductPipeline";
import { buildBenchPressPilotMasterMediaPackage } from "../data/benchPressMasterMediaPackage";
import type { MasterMediaPackage, MediaComposerState } from "../types";
import { mergeMediaComposerState } from "../buildMediaComposerState";

import { buildLessonPlaybackScene } from "./buildLessonPlaybackScene";
import {
  LESSON_PLAYBACK_VERSION,
  resolveLessonAssetStatus,
  resolvePlaybackMediaAssetForSlot,
  type LessonAssetStatus,
  type LessonPlaybackPlan,
  type LessonPlaybackSource,
} from "./types";

export type BuildBenchPressLessonPlaybackPlanInput = {
  pipeline: BenchPressExerciseProductPipeline;
  mediaPackage: MasterMediaPackage;
  composer: MediaComposerState;
  clientGoal: string;
  selectedSceneId?: string;
  assetStatus?: LessonAssetStatus;
};

/** Build a Bench Press lesson playback plan from pipeline, package, and composer state. */
export function buildBenchPressLessonPlaybackPlan(
  input: BuildBenchPressLessonPlaybackPlanInput,
): LessonPlaybackPlan {
  const { pipeline, mediaPackage, composer, clientGoal } = input;
  const coachMessage = composer.coachMessage.trim();
  const hasCoachMessage = coachMessage.length > 0;

  const storyboardScenes = pipeline.storyboard.scenes;
  const totalScenes = storyboardScenes.length;

  const scenes = storyboardScenes.map((storyboardScene, index) => {
    const slot = mediaPackage.slots.find((row) => row.slotType === storyboardScene.slotType);
    const sceneBrief = pipeline.productionBrief.scenes.find(
      (row) => row.sceneId === storyboardScene.sceneId,
    );

    if (!slot || !sceneBrief) {
      throw new Error(
        `Missing slot or brief for storyboard scene ${storyboardScene.sceneId}`,
      );
    }

    const isCoachIntro = storyboardScene.slotType === "coachIntro";
    const source: LessonPlaybackSource =
      isCoachIntro && hasCoachMessage ? "coach-custom" : "oli-master";

    const nextScene = storyboardScenes[index + 1];
    const previousScene = storyboardScenes[index - 1];

    return buildLessonPlaybackScene({
      storyboardScene,
      sceneBrief,
      slot,
      order: index,
      totalScenes,
      source,
      coachMessage: isCoachIntro && hasCoachMessage ? coachMessage : undefined,
      nextSceneId: nextScene?.sceneId,
      previousSceneId: previousScene?.sceneId,
      mediaAsset: resolvePlaybackMediaAssetForSlot(pipeline.exerciseId, slot.slotId),
    });
  });

  const approvedVideoAssetCount = scenes.filter((scene) => scene.mediaAsset).length;
  const totalDurationSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const initialSceneId =
    input.selectedSceneId && scenes.some((scene) => scene.sceneId === input.selectedSceneId)
      ? input.selectedSceneId
      : (scenes[0]?.sceneId ?? "");

  return {
    exerciseId: pipeline.exerciseId,
    productVersion: BENCH_PRESS_PRODUCT_VERSION,
    packageVersion: mediaPackage.packageVersion,
    playbackVersion: LESSON_PLAYBACK_VERSION,
    totalDurationSeconds,
    scenes,
    initialSceneId,
    clientGoal,
    teachingStyle: composer.selectedTeachingStyle,
    difficulty: composer.selectedDifficulty,
    visualEmphasis: composer.selectedVisualEmphasis,
    hasCoachMessage,
    assetStatus:
      input.assetStatus ??
      resolveLessonAssetStatus(approvedVideoAssetCount, scenes.length),
    approvedVideoAssetCount,
  };
}

export type ResolveLessonPlaybackPlanInput = {
  exerciseId: string;
  exerciseName: string;
  mediaComposer?: MediaComposerState;
  clientGoal: string;
  selectedSceneId?: string;
};

/**
 * Resolve a lesson playback plan for an exercise when supported.
 * Returns null for exercises without a structured product pipeline.
 */
export function resolveLessonPlaybackPlan(
  input: ResolveLessonPlaybackPlanInput,
): LessonPlaybackPlan | null {
  if (!isBenchPressProductExercise(input.exerciseId)) {
    return null;
  }

  const composer = mergeMediaComposerState(input.exerciseId, input.mediaComposer);
  const pipeline = buildBenchPressExerciseProductPipeline();
  const mediaPackage = buildBenchPressPilotMasterMediaPackage();

  return buildBenchPressLessonPlaybackPlan({
    pipeline,
    mediaPackage,
    composer,
    clientGoal: input.clientGoal,
    selectedSceneId: input.selectedSceneId,
  });
}
