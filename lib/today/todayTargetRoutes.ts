import type { TodayTargetId } from "@/lib/today/types";

export const TODAY_TARGET_ROUTES: Record<TodayTargetId, string> = {
  activity: "/(app)/activity",
  workout: "/(app)/workouts",
  cardio: "/(app)/cardio",
  calories: "/(app)/nutrition",
  protein: "/(app)/nutrition",
};

/** Recovery detail routes for Today’s Progress card rows (not completion targets). */
export const TODAY_PROGRESS_RECOVERY_ROUTES = {
  sleep: "/(app)/recovery/sleep",
  readiness: "/(app)/recovery/readiness",
} as const;

export type TodayProgressRowId = TodayTargetId | keyof typeof TODAY_PROGRESS_RECOVERY_ROUTES;

export const TODAY_PROGRESS_ROW_ORDER: readonly TodayProgressRowId[] = [
  "activity",
  "workout",
  "cardio",
  "calories",
  "protein",
  "sleep",
  "readiness",
];

export function todayTargetRoute(id: TodayTargetId): string {
  return TODAY_TARGET_ROUTES[id];
}

export function todayProgressRowRoute(id: TodayProgressRowId): string {
  if (id === "sleep") return TODAY_PROGRESS_RECOVERY_ROUTES.sleep;
  if (id === "readiness") return TODAY_PROGRESS_RECOVERY_ROUTES.readiness;
  return TODAY_TARGET_ROUTES[id];
}
