// lib/ui/timeline/timelinePresentationIcon.ts
// Map Timeline presentation kinds to the established Ionicons set.
import type { TimelinePresentationKind } from "@oli/contracts";

const KIND_ICONS: Record<TimelinePresentationKind, string> = {
  sleep_context: "moon-outline",
  recovery_context: "heart-outline",
  sleep_start: "moon-outline",
  sleep_wake: "sunny-outline",
  nutrition: "restaurant-outline",
  caffeine: "cafe-outline",
  incomplete: "create-outline",
  workout_strength: "barbell-outline",
  workout_cardio: "bicycle-outline",
  workout: "fitness-outline",
  steps: "walk-outline",
  weight: "body-outline",
  insight: "bulb-outline",
  activity_live: "walk-outline",
  activity_final: "walk-outline",
};

export function timelinePresentationIcon(kind: TimelinePresentationKind): string {
  return KIND_ICONS[kind] ?? "ellipse-outline";
}
