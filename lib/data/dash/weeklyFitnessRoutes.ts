/** Typed Expo Router hrefs for Dash Weekly Fitness navigation. */
export type WeeklyFitnessRowKey = "activity" | "strength" | "cardio";

export const WEEKLY_FITNESS_ROUTES = {
  /** "My goal" pressable; user-editable Dash Weekly Fitness goals. */
  goalsEditor: "/(app)/fitness-goals",
  activity: "/(app)/activity",
  strength: "/(app)/workouts",
  cardio: "/(app)/cardio",
} as const satisfies Record<"goalsEditor" | WeeklyFitnessRowKey, string>;

export function weeklyFitnessMetricPageHref(
  key: WeeklyFitnessRowKey,
): (typeof WEEKLY_FITNESS_ROUTES)[WeeklyFitnessRowKey] {
  return WEEKLY_FITNESS_ROUTES[key];
}
