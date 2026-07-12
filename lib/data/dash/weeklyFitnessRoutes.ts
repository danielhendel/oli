/** Typed Expo Router hrefs for Dash Weekly Fitness navigation. */
export type WeeklyFitnessRowKey =
  | "sleep"
  | "readiness"
  | "activity"
  | "strength"
  | "cardio"
  | "nutrition"
  | "stress";

export const WEEKLY_FITNESS_METRIC_ORDER = [
  "sleep",
  "readiness",
  "activity",
  "strength",
  "cardio",
  "nutrition",
  "stress",
] as const satisfies readonly WeeklyFitnessRowKey[];

export const WEEKLY_FITNESS_ROUTES = {
  /** "My goal" pressable; user-editable Dash Weekly Fitness goals. */
  goalsEditor: "/(app)/fitness-goals",
  /** Body Composition analytics when a score is available. */
  bodyComposition: "/(app)/body/overview",
  /** Oura connect / reconnect for Readiness & Stress disconnect states. */
  ouraConnect: "/(app)/settings/devices/oura",
  sleep: "/(app)/recovery/sleep",
  readiness: "/(app)/recovery/readiness",
  activity: "/(app)/activity",
  strength: "/(app)/workouts",
  cardio: "/(app)/cardio",
  nutrition: "/(app)/nutrition",
  stress: "/(app)/recovery/stress",
} as const satisfies Record<
  "goalsEditor" | "bodyComposition" | "ouraConnect" | WeeklyFitnessRowKey,
  string
>;

export function weeklyFitnessMetricPageHref(
  key: WeeklyFitnessRowKey,
): (typeof WEEKLY_FITNESS_ROUTES)[WeeklyFitnessRowKey] {
  return WEEKLY_FITNESS_ROUTES[key];
}
