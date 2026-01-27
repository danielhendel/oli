// lib/contracts/preferences.ts
import { z } from "zod";

export const massUnitSchema = z.enum(["lb", "kg"]);
export type MassUnit = z.infer<typeof massUnitSchema>;

export const timezoneModeSchema = z.enum(["recorded", "current", "explicit"]);
export type TimezoneMode = z.infer<typeof timezoneModeSchema>;

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
});
