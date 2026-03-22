import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutOverride, WorkoutOverrideType } from "@/lib/data/workouts/workoutOverrides";

const WELL_KNOWN_TITLE_OVERRIDES: Record<string, string> = {
  traditionalstrengthtraining: "Strength Training",
  indoorcycle: "Indoor Cycling",
};

const ALL_CAPS_WORDS = new Set(["HIIT", "HR", "AMRAP", "EMOM", "VO2"]);

function titleCaseWord(word: string): string {
  const upper = word.toUpperCase();
  if (ALL_CAPS_WORDS.has(upper)) return upper;
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function splitIdentifierWords(input: string): string[] {
  const normalized = input
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

export function formatWorkoutTitle(rawTitle: string | null | undefined): string {
  const title = (rawTitle ?? "").trim();
  if (!title) return "Workout";

  const compact = title.replace(/[\s_-]+/g, "").toLowerCase();
  const override = WELL_KNOWN_TITLE_OVERRIDES[compact];
  if (override) return override;

  // Keep intentional custom names as-is when they already include spacing.
  if (/\s/.test(title) && /[a-z]/.test(title)) return title;

  const words = splitIdentifierWords(title);
  if (words.length === 0) return "Workout";
  return words.map(titleCaseWord).join(" ");
}

export function formatWorkoutSourceLabel(workout: WorkoutHistoryItem): string {
  if (workout.hk?.sourceId) return `Apple Health · ${workout.hk.sourceId}`;
  const source = (workout.sourceId ?? "").trim();
  if (!source) return "Unknown source";
  if (source === "apple_health") return "Apple Health";
  if (source === "manual") return "Manual";
  return source;
}

export function formatWorkoutTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatIntegerWithCommas(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString();
}

export function formatWorkoutDurationLabel(minutes: number | null | undefined): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return "—";
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

const METERS_PER_MILE = 1609.344;

/** Running/cycling-style distance when `distanceMeters` is present on the workout item. */
export function formatWorkoutDistanceLabel(distanceMeters: number | null | undefined): string {
  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return "—";
  }
  const mi = distanceMeters / METERS_PER_MILE;
  if (mi >= 0.15) return `${mi.toFixed(2)} mi`;
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

/** Minutes per mile when distance and duration are known; otherwise "—". */
export function formatAvgPaceMinPerMileLabel(
  distanceMeters: number | null | undefined,
  durationMinutes: number | null | undefined,
): string {
  if (
    typeof distanceMeters !== "number" ||
    typeof durationMinutes !== "number" ||
    !Number.isFinite(distanceMeters) ||
    !Number.isFinite(durationMinutes) ||
    distanceMeters <= 0 ||
    durationMinutes <= 0
  ) {
    return "—";
  }
  const mi = distanceMeters / METERS_PER_MILE;
  if (mi < 1e-6) return "—";
  const minPerMi = durationMinutes / mi;
  const whole = Math.floor(minPerMi);
  const sec = Math.min(59, Math.round((minPerMi - whole) * 60));
  return `${whole}:${sec.toString().padStart(2, "0")} /mi`;
}

export function formatWorkoutRowSummary(workout: WorkoutHistoryItem): string | null {
  const parts: string[] = [];
  if (typeof workout.durationMinutes === "number") {
    parts.push(`${Math.round(workout.durationMinutes)} min`);
  }
  if (typeof workout.calories === "number") {
    parts.push(`${Math.round(workout.calories)} kcal`);
  }
  const source = formatWorkoutSourceLabel(workout);
  if (source.length > 0) {
    parts.push(source);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function resolveWorkoutType(
  workout: WorkoutHistoryItem,
  override?: WorkoutOverride | null,
): WorkoutOverrideType {
  if (override?.correctedWorkoutType) return override.correctedWorkoutType;
  if (workout.workoutType === "strength" || workout.workoutType === "cardio") {
    return workout.workoutType;
  }
  return "other";
}

export function formatWorkoutTypeLabel(type: WorkoutOverrideType): string {
  if (type === "strength") return "Strength";
  if (type === "cardio") return "Cardio";
  return "Other";
}

export function resolveWorkoutDisplay(
  workout: WorkoutHistoryItem,
  override?: WorkoutOverride | null,
): {
  displayTitle: string;
  displayDurationMinutes: number | null;
  displayWorkoutType: WorkoutOverrideType;
} {
  const title = override?.customTitle?.trim();
  const displayTitle = formatWorkoutTitle(title && title.length > 0 ? title : workout.title);
  const displayDurationMinutes =
    typeof override?.correctedDurationMinutes === "number"
      ? override.correctedDurationMinutes
      : workout.durationMinutes;
  const displayWorkoutType = resolveWorkoutType(workout, override);
  return { displayTitle, displayDurationMinutes, displayWorkoutType };
}

export function resolveWorkoutDisplayDurationMinutes(input: {
  overrideDurationMinutes?: number | null;
  sessionDurationMinutes?: number | null;
  fallbackWorkoutDurationMinutes?: number | null;
}): number | null {
  if (
    typeof input.overrideDurationMinutes === "number" &&
    Number.isFinite(input.overrideDurationMinutes) &&
    input.overrideDurationMinutes > 0
  ) {
    return input.overrideDurationMinutes;
  }
  if (
    typeof input.sessionDurationMinutes === "number" &&
    Number.isFinite(input.sessionDurationMinutes) &&
    input.sessionDurationMinutes > 0
  ) {
    return input.sessionDurationMinutes;
  }
  if (
    typeof input.fallbackWorkoutDurationMinutes === "number" &&
    Number.isFinite(input.fallbackWorkoutDurationMinutes) &&
    input.fallbackWorkoutDurationMinutes > 0
  ) {
    return input.fallbackWorkoutDurationMinutes;
  }
  return null;
}
