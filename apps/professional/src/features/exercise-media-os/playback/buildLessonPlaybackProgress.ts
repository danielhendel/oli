import type { LessonPlaybackPlan, LessonPlaybackProgress, LessonPlaybackScene } from "./types";

/** Resolve a playback scene by id. */
export function getPlaybackSceneById(
  plan: LessonPlaybackPlan,
  sceneId: string,
): LessonPlaybackScene | undefined {
  return plan.scenes.find((scene) => scene.sceneId === sceneId);
}

/** Return the next scene in the plan, or undefined at the end. */
export function getNextPlaybackScene(
  plan: LessonPlaybackPlan,
  currentSceneId: string,
): LessonPlaybackScene | undefined {
  const current = getPlaybackSceneById(plan, currentSceneId);
  if (!current?.nextSceneId) return undefined;
  return getPlaybackSceneById(plan, current.nextSceneId);
}

/** Return the previous scene in the plan, or undefined at the start. */
export function getPreviousPlaybackScene(
  plan: LessonPlaybackPlan,
  currentSceneId: string,
): LessonPlaybackScene | undefined {
  const current = getPlaybackSceneById(plan, currentSceneId);
  if (!current?.previousSceneId) return undefined;
  return getPlaybackSceneById(plan, current.previousSceneId);
}

/** Build deterministic playback progress from plan state. */
export function buildLessonPlaybackProgress(
  plan: LessonPlaybackPlan,
  currentSceneId: string,
  sceneElapsedSeconds: number,
): LessonPlaybackProgress {
  const currentSceneIndex = Math.max(
    0,
    plan.scenes.findIndex((scene) => scene.sceneId === currentSceneId),
  );
  const currentScene = plan.scenes[currentSceneIndex];
  const safeElapsed = Math.max(0, sceneElapsedSeconds);
  const sceneDuration = currentScene?.durationSeconds ?? 0;
  const clampedSceneElapsed = sceneDuration > 0 ? Math.min(safeElapsed, sceneDuration) : 0;

  const elapsedBeforeCurrent = plan.scenes
    .slice(0, currentSceneIndex)
    .reduce((sum, scene) => sum + scene.durationSeconds, 0);

  const elapsedSeconds = elapsedBeforeCurrent + clampedSceneElapsed;
  const totalDurationSeconds = plan.totalDurationSeconds;
  const percentComplete =
    totalDurationSeconds > 0
      ? Math.round((elapsedSeconds / totalDurationSeconds) * 100)
      : 0;
  const sceneProgressPercent =
    sceneDuration > 0 ? Math.round((clampedSceneElapsed / sceneDuration) * 100) : 0;

  return {
    currentSceneIndex,
    totalScenes: plan.scenes.length,
    elapsedSeconds,
    totalDurationSeconds,
    percentComplete,
    sceneProgressPercent,
  };
}
