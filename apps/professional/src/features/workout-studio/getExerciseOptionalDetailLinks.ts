import type { ExerciseCardTab } from "@/components/workout-studio/exercise-card/types";

export type ExerciseOptionalDetailLink = {
  readonly label: string;
  readonly tab: ExerciseCardTab;
};

export const EXERCISE_OPTIONAL_DETAIL_LINKS: readonly ExerciseOptionalDetailLink[] = [
  { label: "Media", tab: "media" },
  { label: "Lesson", tab: "lesson" },
  { label: "Coaching", tab: "coaching" },
  { label: "Progression", tab: "progression" },
  { label: "Tracking", tab: "tracking" },
] as const;

export function getExerciseOptionalDetailLinks(): readonly ExerciseOptionalDetailLink[] {
  return EXERCISE_OPTIONAL_DETAIL_LINKS;
}
