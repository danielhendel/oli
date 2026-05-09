// lib/contracts/preferences.ts
import { z } from "zod";

export const massUnitSchema = z.enum(["lb", "kg"]);
export type MassUnit = z.infer<typeof massUnitSchema>;

export const timezoneModeSchema = z.enum(["recorded", "current", "explicit"]);
export type TimezoneMode = z.infer<typeof timezoneModeSchema>;

/**
 * User-set Dash Weekly Fitness goals.
 *
 * Display-only (used by Dash “This Week’s Results” progress bars). Truth metrics never
 * change based on goals. Defaults are applied client-side when the field is absent.
 */
export const WEEKLY_FITNESS_GOAL_LIMITS = {
  activityStepsPerDayMin: 1_000,
  activityStepsPerDayMax: 40_000,
  strengthWorkoutsPerWeekMin: 0,
  strengthWorkoutsPerWeekMax: 14,
  cardioMilesPerWeekMin: 0,
  cardioMilesPerWeekMax: 100,
} as const;

export const WEEKLY_FITNESS_GOAL_DEFAULTS = {
  activityStepsPerDayGoal: 10_000,
  strengthWorkoutsPerWeekGoal: 5,
  cardioMilesPerWeekGoal: 10,
} as const;

export const weeklyFitnessGoalsSchema = z
  .object({
    activityStepsPerDayGoal: z
      .number()
      .int()
      .min(WEEKLY_FITNESS_GOAL_LIMITS.activityStepsPerDayMin)
      .max(WEEKLY_FITNESS_GOAL_LIMITS.activityStepsPerDayMax),
    strengthWorkoutsPerWeekGoal: z
      .number()
      .int()
      .min(WEEKLY_FITNESS_GOAL_LIMITS.strengthWorkoutsPerWeekMin)
      .max(WEEKLY_FITNESS_GOAL_LIMITS.strengthWorkoutsPerWeekMax),
    cardioMilesPerWeekGoal: z
      .number()
      .min(WEEKLY_FITNESS_GOAL_LIMITS.cardioMilesPerWeekMin)
      .max(WEEKLY_FITNESS_GOAL_LIMITS.cardioMilesPerWeekMax),
    /** ISO 8601 timestamp; the server stamps this on each PUT. */
    updatedAt: z.string().datetime(),
  })
  .strip();
export type WeeklyFitnessGoals = z.infer<typeof weeklyFitnessGoalsSchema>;

/**
 * Phase 1 view preferences.
 *
 * Invariants:
 * - Preferences only affect presentation (units/timezone bucketing).
 * - Canonical truth remains stored in canonical units (e.g., kg) and immutable day keys.
 */
export const preferencesSchema = z
  .object({
    units: z
      .object({
        mass: massUnitSchema,
      })
      .strip(),

    timezone: z
      .object({
        mode: timezoneModeSchema,
        // Required only when mode === "explicit"
        explicitIana: z.string().min(1).optional(),
      })
      .strip(),

    /** Workout-scoped: selected gym id for exercise library filtering. null = no gym selected. */
    selectedGymId: z.string().nullable(),

    /**
     * Data Sources — one preferred source per metric.
     * Keys: metric IDs (e.g. weight, steps). Values: sourceId (e.g. apple_health, manual).
     * Absent key = use default / not set.
     */
    metricSources: z.record(z.string().min(1), z.string().min(1)).optional(),

    /**
     * When an array (possibly empty), exercise picker lists only these bundled exercise ids plus all custom exercises.
     * `null` or omitted (after merge) = show full bundled catalog.
     */
    workoutPickerBundledAllowlistExerciseIds: z
      .array(z.string().regex(/^[a-z0-9]+(_[a-z0-9]+)*$/))
      .nullable()
      .optional(),

    /** Dash Weekly Fitness goals (display-only). Defaults applied when missing. */
    weeklyFitnessGoals: weeklyFitnessGoalsSchema.optional(),
  })
  .strip()
  .superRefine((val, ctx) => {
    if (val.timezone.mode === "explicit" && !val.timezone.explicitIana) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timezone", "explicitIana"],
        message: "explicitIana is required when timezone.mode is 'explicit'",
      });
    }
  });

export type Preferences = z.infer<typeof preferencesSchema>;

/**
 * Phase 1 defaults.
 *
 * Product decision:
 * - US-default weight display uses pounds.
 */
export const defaultPreferences = (): Preferences => ({
  units: { mass: "lb" },
  timezone: { mode: "recorded" },
  selectedGymId: null,
  metricSources: {},
});
