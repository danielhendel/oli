import type { TodayTargetId } from "@/lib/today/types";

export const TODAY_TARGET_ROUTES: Record<TodayTargetId, string> = {
  activity: "/(app)/activity",
  workout: "/(app)/workouts",
  cardio: "/(app)/cardio",
  calories: "/(app)/nutrition",
  protein: "/(app)/nutrition",
};

export function todayTargetRoute(id: TodayTargetId): string {
  return TODAY_TARGET_ROUTES[id];
}
