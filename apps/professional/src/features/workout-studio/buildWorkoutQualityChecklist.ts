import type { WorkoutProjectedVolume } from "./buildWorkoutProjectedVolume";
import type { WorkoutExperience } from "./types";

export type WorkoutQualityChecklistItemId =
  | "purposeComplete"
  | "hasBlocks"
  | "hasExercises"
  | "hasDesignedSets"
  | "hasCoachingDetails"
  | "hasProgression"
  | "hasProjectedVolume";

export type WorkoutQualityChecklistItem = {
  id: WorkoutQualityChecklistItemId;
  label: string;
  complete: boolean;
  detail: string;
};

export type WorkoutQualityChecklist = {
  items: WorkoutQualityChecklistItem[];
  completedCount: number;
  totalCount: number;
  scorePercent: number;
};

const CHECKLIST_ORDER: WorkoutQualityChecklistItemId[] = [
  "purposeComplete",
  "hasBlocks",
  "hasExercises",
  "hasDesignedSets",
  "hasCoachingDetails",
  "hasProgression",
  "hasProjectedVolume",
];

function exerciseHasCoachingDetails(
  exercise: WorkoutExperience["blocks"][number]["exercises"][number],
): boolean {
  return (
    exercise.design.whyThisExercise.trim().length > 0 ||
    exercise.design.setupInstructions.trim().length > 0 ||
    exercise.design.executionInstructions.trim().length > 0 ||
    exercise.design.coachingCues.some((cue) => cue.text.trim().length > 0)
  );
}

/** Draft quality checklist — not AI scoring. */
export function buildWorkoutQualityChecklist(
  workout: WorkoutExperience,
  projectedVolume?: WorkoutProjectedVolume,
): WorkoutQualityChecklist {
  const allExercises = workout.blocks.flatMap((block) => block.exercises);
  const exerciseCount = allExercises.length;
  const setCount = allExercises.reduce((sum, exercise) => sum + exercise.designedSets.length, 0);
  const coachingCount = allExercises.filter(exerciseHasCoachingDetails).length;
  const progressionCount = allExercises.filter((exercise) =>
    exercise.progressionRules.some((rule) => rule.text.trim().length > 0),
  ).length;
  const volumeTotal = projectedVolume?.totalSets ?? 0;

  const statusById: Record<WorkoutQualityChecklistItemId, { complete: boolean; detail: string }> = {
    purposeComplete: {
      complete: workout.overview.objective.trim().length > 0,
      detail: workout.overview.objective.trim() ? "Objective defined" : "Add workout objective",
    },
    hasBlocks: {
      complete: workout.blocks.length > 0,
      detail: workout.blocks.length > 0 ? `${workout.blocks.length} block(s)` : "Add at least one block",
    },
    hasExercises: {
      complete: exerciseCount > 0,
      detail: exerciseCount > 0 ? `${exerciseCount} exercise(s)` : "Add exercises from the library",
    },
    hasDesignedSets: {
      complete: setCount > 0,
      detail: setCount > 0 ? `${setCount} designed set(s)` : "Design sets for exercises",
    },
    hasCoachingDetails: {
      complete: coachingCount > 0,
      detail:
        coachingCount > 0
          ? `${coachingCount} exercise(s) with coaching`
          : "Add why/setup/cues for at least one exercise",
    },
    hasProgression: {
      complete: progressionCount > 0,
      detail:
        progressionCount > 0
          ? `${progressionCount} exercise(s) with progression`
          : "Add progression guidance",
    },
    hasProjectedVolume: {
      complete: volumeTotal > 0,
      detail: volumeTotal > 0 ? `${volumeTotal} projected set(s)` : "Volume appears after designed sets",
    },
  };

  const items = CHECKLIST_ORDER.map((id) => ({
    id,
    label: labelForChecklistItem(id),
    complete: statusById[id].complete,
    detail: statusById[id].detail,
  }));

  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    scorePercent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}

function labelForChecklistItem(id: WorkoutQualityChecklistItemId): string {
  switch (id) {
    case "purposeComplete":
      return "Purpose complete";
    case "hasBlocks":
      return "Has blocks";
    case "hasExercises":
      return "Has exercises";
    case "hasDesignedSets":
      return "Has designed sets";
    case "hasCoachingDetails":
      return "Has coaching details";
    case "hasProgression":
      return "Has progression";
    case "hasProjectedVolume":
      return "Has projected volume";
  }
}
