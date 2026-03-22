import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

export type WorkoutMarkerFlags = {
  hasStrength: boolean;
  hasCardio: boolean;
};

const STRENGTH_TERMS = [
  "traditionalstrengthtraining",
  "functionalstrengthtraining",
  "strengthtraining",
  "strength",
  "weighttraining",
  "resistancetraining",
  "weightlifting",
  "olympicweightlifting",
  "powerlifting",
  "bodybuilding",
  "crossfit",
  "gym",
  "deadlift",
  "squat",
  "benchpress",
  "resistance",
];

const CARDIO_TERMS = [
  "running",
  "walking",
  "hiking",
  "cycling",
  "biking",
  "rowing",
  "elliptical",
  "stair",
  "stepper",
  "swimming",
  "jumprope",
  "dancecardio",
  "aerobic",
  "endurance",
  "jog",
];

function compact(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s_-]+/g, "").toLowerCase();
}

function containsAnyToken(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function classifyWorkoutType(input: {
  rawKind?: string | null | undefined;
  title?: string | null | undefined;
  sport?: string | null | undefined;
  activityName?: string | null | undefined;
}): "strength" | "cardio" | undefined {
  if (input.rawKind === "strength_workout") return "strength";

  // Prefer normalized/sport signals before title fallbacks.
  const sportToken = compact(input.sport);
  const activityToken = compact(input.activityName);
  const titleToken = compact(input.title);

  const normalized = [sportToken, activityToken].filter(Boolean).join(" ");
  if (normalized.length === 0 && titleToken.length === 0) {
    return undefined;
  }
  if (normalized.length > 0) {
    if (containsAnyToken(normalized, STRENGTH_TERMS)) return "strength";
    if (containsAnyToken(normalized, CARDIO_TERMS)) return "cardio";
  }

  if (titleToken.length > 0) {
    if (containsAnyToken(titleToken, STRENGTH_TERMS)) return "strength";
    if (containsAnyToken(titleToken, CARDIO_TERMS)) return "cardio";
  }

  return "cardio";
}

export function deriveWorkoutMarkerFlags(workouts: WorkoutHistoryItem[]): WorkoutMarkerFlags {
  let hasStrength = false;
  let hasCardio = false;

  for (const workout of workouts) {
    const type =
      workout.workoutType ??
      classifyWorkoutType({
        title: workout.title,
        sport: workout.sport,
        activityName: workout.activityName,
      });
    if (type === "strength") {
      hasStrength = true;
      continue;
    }
    if (type === "cardio") {
      hasCardio = true;
    }
  }

  return { hasStrength, hasCardio };
}
