import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

/** Addressable sections on the Strength Analytics screen (scroll + emphasis). */
export const STRENGTH_ANALYTICS_SECTION_TARGETS = [
  "weekly_strength",
  "weekly_muscle_group",
  "monthly_workouts",
  "yearly_workouts",
] as const;

export type StrengthAnalyticsSectionTarget = (typeof STRENGTH_ANALYTICS_SECTION_TARGETS)[number];

/** Optional UI emphasis / future drill-down hints (tabs, badges). */
export type StrengthAnalyticsEmphasis = "balance" | "trend" | "focus" | "volume" | "sets";

/**
 * Typed destination when deep-linking from Weekly Insights (or future entry points)
 * into Strength Analytics.
 */
export type WeeklyInsightDestination = {
  section: StrengthAnalyticsSectionTarget;
  emphasis?: StrengthAnalyticsEmphasis;
  /** Dominant or referenced muscle for muscle-group analytics. */
  muscleGroup?: MuscleGroup;
};

/** Route param keys (expo-router) — keep in sync with parse/serialize only. */
export const STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS = {
  section: "focusSection",
  emphasis: "focusEmphasis",
  muscle: "focusMuscle",
} as const;

const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

const EMPHASIS_VALUES: readonly StrengthAnalyticsEmphasis[] = [
  "balance",
  "trend",
  "focus",
  "volume",
  "sets",
];

function isStrengthAnalyticsSectionTarget(v: string): v is StrengthAnalyticsSectionTarget {
  return (STRENGTH_ANALYTICS_SECTION_TARGETS as readonly string[]).includes(v);
}

function isMuscleGroup(v: string): v is MuscleGroup {
  return (MUSCLE_GROUPS as readonly string[]).includes(v);
}

function isStrengthAnalyticsEmphasis(v: string): v is StrengthAnalyticsEmphasis {
  return (EMPHASIS_VALUES as readonly string[]).includes(v);
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === "string" ? v : v[0];
}

/**
 * Read typed focus intent from expo-router search params.
 */
export function parseStrengthAnalyticsFocusFromParams(
  params: Record<string, string | string[] | undefined>,
): WeeklyInsightDestination | null {
  const sectionRaw = firstString(params[STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.section]);
  if (sectionRaw == null || sectionRaw === "" || !isStrengthAnalyticsSectionTarget(sectionRaw)) {
    return null;
  }
  const emphasisRaw = firstString(params[STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.emphasis]);
  const muscleRaw = firstString(params[STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.muscle]);

  const out: WeeklyInsightDestination = { section: sectionRaw };
  if (emphasisRaw != null && emphasisRaw !== "" && isStrengthAnalyticsEmphasis(emphasisRaw)) {
    out.emphasis = emphasisRaw;
  }
  if (muscleRaw != null && muscleRaw !== "" && isMuscleGroup(muscleRaw)) {
    out.muscleGroup = muscleRaw;
  }
  return out;
}

/**
 * Serialize focus intent for `router.push({ pathname, params })`.
 */
export function serializeStrengthAnalyticsFocusParams(
  dest: WeeklyInsightDestination,
): Record<string, string> {
  const next: Record<string, string> = {
    [STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.section]: dest.section,
  };
  if (dest.emphasis != null) {
    next[STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.emphasis] = dest.emphasis;
  }
  if (dest.muscleGroup != null) {
    next[STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.muscle] = dest.muscleGroup;
  }
  return next;
}

/** Params object that clears focus keys (expo-router). */
export function clearedStrengthAnalyticsFocusParams(): Record<string, undefined> {
  return {
    [STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.section]: undefined,
    [STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.emphasis]: undefined,
    [STRENGTH_ANALYTICS_FOCUS_PARAM_KEYS.muscle]: undefined,
  };
}
