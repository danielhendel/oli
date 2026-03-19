import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

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
