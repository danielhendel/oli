import {
  NUTRITION_KCAL_GOAL,
  NUTRITION_PROTEIN_G_GOAL,
} from "@/lib/data/nutrition/nutritionGoals";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";
import { dailyCardioMilesTargetFromWeekly } from "@/lib/today/defaults";

export type ProgramCategoryId = "weight" | "activity" | "workout" | "cardio" | "nutrition";

export type ProgramCategoryCardModel = {
  id: ProgramCategoryId;
  title: string;
  targetSummary: string;
  todayRelevance: string;
  editHref: string;
  usesDefaultTarget: boolean;
};

const PROGRAM_CATEGORY_ROUTES: Record<ProgramCategoryId, string> = {
  weight: "/(app)/body/settings",
  activity: "/(app)/fitness-goals",
  workout: "/(app)/program/workout",
  cardio: "/(app)/program/cardio",
  nutrition: "/(app)/program/nutrition",
};

export function buildProgramCategoryCards(
  goals: WeeklyFitnessGoalsResolved,
): ProgramCategoryCardModel[] {
  const dailyCardio = dailyCardioMilesTargetFromWeekly(goals.cardioMilesPerWeekGoal);

  return [
    {
      id: "weight",
      title: "Weight",
      targetSummary: "Set a body composition goal in Body settings.",
      todayRelevance: "Guides long-term plan alignment.",
      editHref: PROGRAM_CATEGORY_ROUTES.weight,
      usesDefaultTarget: true,
    },
    {
      id: "activity",
      title: "Activity",
      targetSummary: `${goals.activityStepsPerDayGoal.toLocaleString()} steps / day`,
      todayRelevance: "Feeds today's activity row on Dash.",
      editHref: PROGRAM_CATEGORY_ROUTES.activity,
      usesDefaultTarget: goals.isDefault,
    },
    {
      id: "workout",
      title: "Workout",
      targetSummary:
        goals.strengthWorkoutsPerWeekGoal > 0
          ? `${goals.strengthWorkoutsPerWeekGoal} strength sessions / week`
          : "No weekly strength target set",
      todayRelevance:
        goals.strengthWorkoutsPerWeekGoal > 0 ? "1 planned workout today when scheduled." : "Rest day target.",
      editHref: PROGRAM_CATEGORY_ROUTES.workout,
      usesDefaultTarget: goals.isDefault,
    },
    {
      id: "cardio",
      title: "Cardio",
      targetSummary:
        goals.cardioMilesPerWeekGoal > 0
          ? `${goals.cardioMilesPerWeekGoal} mi / week (~${dailyCardio?.toFixed(1) ?? "—"} mi / day)`
          : "No weekly cardio target set",
      todayRelevance: "Feeds today's cardio row on Dash.",
      editHref: PROGRAM_CATEGORY_ROUTES.cardio,
      usesDefaultTarget: goals.isDefault,
    },
    {
      id: "nutrition",
      title: "Nutrition",
      targetSummary: `${NUTRITION_KCAL_GOAL.toLocaleString()} kcal · ${NUTRITION_PROTEIN_G_GOAL} g protein / day`,
      todayRelevance: "Feeds calories and protein rows on Dash.",
      editHref: PROGRAM_CATEGORY_ROUTES.nutrition,
      usesDefaultTarget: true,
    },
  ];
}
