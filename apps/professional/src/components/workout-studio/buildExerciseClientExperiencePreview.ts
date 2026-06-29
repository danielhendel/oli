import { getExerciseMediaOsBundle } from "../../features/exercise-media-os/exerciseMediaRegistry";
import { summarizeExerciseForCanvas } from "../../features/workout-studio/exerciseSummaryUtils";
import type { WorkoutExerciseCard } from "../../features/workout-studio/types";

import { buildLessonPlaybackPreviewContext } from "../../features/exercise-media-os/playback/buildLessonPlaybackPreviewContext";
import {
  buildLessonNarrativeScenes,
  resolveSelectedGoal,
} from "./exercise-card/exerciseExperienceBuilderUi";
import {
  buildFocusCardsForExercise,
  readinessLabel,
} from "./exercise-card/mediaLessonDirectorUi";

export type ExerciseClientExperiencePreview = {
  exerciseName: string;
  goalTitle: string;
  goalDescription: string;
  activeSceneTitle: string;
  activeScenePurpose: string;
  mediaVisualLabel: string | null;
  packageComplete: boolean;
  timelineSceneCount: number;
  setCount: number;
  setSummary: string;
  repRangeSummary: string;
  rpeSummary: string;
  keyCues: string[];
  shouldFeel: string[];
  trackingFields: string[];
  coachMessage: string;
  mediaReadinessLabel: string;
  lessonPlaybackAvailable: boolean;
  lessonPlaybackStatusLabel: string;
};

export function buildExerciseClientExperiencePreview(
  exercise: WorkoutExerciseCard,
): ExerciseClientExperiencePreview {
  const summary = summarizeExerciseForCanvas(exercise);
  const bundle = getExerciseMediaOsBundle({
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    mediaComposer: exercise.mediaComposer,
  });
  const focusCards = buildFocusCardsForExercise(exercise.exerciseName, exercise.primaryMuscles);
  const goal = resolveSelectedGoal(focusCards, bundle.composer.selectedTodayFocus);
  const playbackContext = buildLessonPlaybackPreviewContext({
    exercise,
    clientGoal: goal.title,
  });
  const scenes = buildLessonNarrativeScenes({
    goal,
    timelineItems: bundle.timeline.items,
    activeSceneId: "scene-goal",
  });
  const activeScene = scenes[0] ?? {
    title: "Goal",
    purpose: goal.description,
  };

  const firstPlaybackScene = playbackContext.plan?.scenes[0];
  const activeTimelineItem = bundle.timeline.items[0];
  const activeSlot = bundle.mediaPackage.slots.find(
    (slot) => slot.slotType === activeTimelineItem?.slotType,
  );

  const keyCues = exercise.design.coachingCues
    .map((cue) => cue.text.trim())
    .filter(Boolean)
    .slice(0, 3);

  const shouldFeel = exercise.design.shouldFeel
    .map((item) => item.text.trim())
    .filter(Boolean)
    .slice(0, 3);

  const trackingFields = exercise.logging.fields
    .filter((field) => field.enabled)
    .map((field) => field.label ?? field.kind);

  const setSummary =
    summary.setCount === 0
      ? "No sets designed yet"
      : `${summary.setCount} set${summary.setCount === 1 ? "" : "s"} · ${summary.repRangeSummary}`;

  return {
    exerciseName: exercise.exerciseName,
    goalTitle: goal.title,
    goalDescription: goal.description,
    activeSceneTitle: firstPlaybackScene?.title ?? activeScene.title,
    activeScenePurpose: firstPlaybackScene?.clientPurpose ?? activeScene.purpose,
    mediaVisualLabel:
      firstPlaybackScene?.visualLabel ?? activeSlot?.placeholderVisualLabel ?? null,
    packageComplete: bundle.mediaPackage.status === "complete",
    timelineSceneCount: bundle.timeline.items.length,
    setCount: summary.setCount,
    setSummary,
    repRangeSummary: summary.repRangeSummary,
    rpeSummary: summary.rpeSummary,
    keyCues,
    shouldFeel,
    trackingFields,
    coachMessage: bundle.composer.coachMessage.trim(),
    mediaReadinessLabel: readinessLabel(bundle.readiness.score),
    lessonPlaybackAvailable: playbackContext.available,
    lessonPlaybackStatusLabel: playbackContext.statusLabel,
  };
}
