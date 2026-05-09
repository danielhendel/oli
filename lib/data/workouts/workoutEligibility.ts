import {
  displayLabelForAppleHealthKitWorkoutActivityType,
  HK_WORKOUT_ACTIVITY_TYPE_OTHER,
} from "@/lib/data/workouts/appleHealthKitWorkoutActivityType";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

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
  "indoorwalk",
  "outdoorwalk",
  "indoorrun",
  "outdoorrun",
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

const GENERIC_MODALITY_TERMS = new Set(["other", "unknown", "uncategorized", "workout", "cardio"]);

export type WorkoutEvidenceInput = {
  rawKind?: string | null | undefined;
  workoutType?: "strength" | "cardio" | undefined;
  title?: string | null | undefined;
  sport?: string | null | undefined;
  activityName?: string | null | undefined;
  distanceMeters?: number | null | undefined;
  hkActivityId?: number | null | undefined;
};

function compact(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s_-]+/g, "").toLowerCase();
}

function containsAnyToken(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function hasDistanceSignal(distanceMeters: number | null | undefined): boolean {
  return typeof distanceMeters === "number" && Number.isFinite(distanceMeters) && distanceMeters > 0;
}

function isGenericModalityToken(token: string): boolean {
  return token.length === 0 || GENERIC_MODALITY_TERMS.has(token);
}

function classifyFromStrings(values: string[]): "strength" | "cardio" | undefined {
  const compacted = values.map((v) => compact(v)).filter(Boolean);
  if (compacted.some((t) => containsAnyToken(t, STRENGTH_TERMS))) return "strength";
  if (compacted.some((t) => containsAnyToken(t, CARDIO_TERMS) && !isGenericModalityToken(t))) return "cardio";
  return undefined;
}

/**
 * Word-boundary cardio cues on **natural-language** fields (spaces preserved).
 * Fills gaps where compact tokens omit embedded words (e.g. “Morning Run” → `morningrun` lacks “running”).
 */
const CARDIO_NATURAL_LANGUAGE_RE =
  /\b(run|running|jogs?|jogging|walks?|walking|cycles?|cycling|bikes?|biking|swims?|swimming|hikes?|hiking|rows?|rowing|elliptical)\b/i;

export function hasCardioNaturalLanguageEvidence(
  title?: string | null,
  sport?: string | null,
  activityName?: string | null,
  hkDisplayLabel?: string | null,
): boolean {
  const blob = [title, sport, activityName, hkDisplayLabel]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ");
  if (!blob.trim()) return false;
  return CARDIO_NATURAL_LANGUAGE_RE.test(blob);
}

export function classifyWorkoutEvidence(input: WorkoutEvidenceInput): "strength" | "cardio" | undefined {
  if (input.rawKind === "strength_workout") return "strength";
  if (input.workoutType === "strength" || input.workoutType === "cardio") return input.workoutType;

  const hkId =
    typeof input.hkActivityId === "number" && Number.isFinite(input.hkActivityId)
      ? Math.trunc(input.hkActivityId)
      : null;
  const hkLabel = hkId == null ? null : displayLabelForAppleHealthKitWorkoutActivityType(hkId);
  const fromStrings = classifyFromStrings([
    input.sport ?? "",
    input.activityName ?? "",
    input.title ?? "",
    hkLabel ?? "",
  ]);
  if (fromStrings) return fromStrings;

  if (hasCardioNaturalLanguageEvidence(input.title, input.sport, input.activityName, hkLabel)) {
    return "cardio";
  }

  if (hkId != null && hkId !== HK_WORKOUT_ACTIVITY_TYPE_OTHER && hkLabel != null) {
    return "cardio";
  }

  if (hasDistanceSignal(input.distanceMeters)) return "cardio";

  return undefined;
}

export function classifyWorkoutHistoryItemEvidence(
  item: WorkoutHistoryItem,
): "strength" | "cardio" | undefined {
  return classifyWorkoutEvidence({
    rawKind: item.rawKind,
    workoutType: item.workoutType,
    title: item.title,
    sport: item.sport,
    activityName: item.activityName,
    distanceMeters: item.distanceMeters,
    hkActivityId: item.hk?.activityId,
  });
}

export function isEligibleCardioWorkout(item: WorkoutHistoryItem): boolean {
  return classifyWorkoutHistoryItemEvidence(item) === "cardio";
}

export function isEligibleStrengthWorkout(item: WorkoutHistoryItem): boolean {
  return classifyWorkoutHistoryItemEvidence(item) === "strength";
}
