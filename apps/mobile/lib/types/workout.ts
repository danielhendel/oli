/**
 * Purpose: Canonical Workout types + Zod schema shared by DAL, hooks, UI.
 * Side-effects: none
 */

import { z } from "zod";

export const SetEntrySchema = z.object({
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative().default(0),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});
export type SetEntry = z.infer<typeof SetEntrySchema>;

export const ExerciseEntrySchema = z.object({
  id: z.string().default(() => Math.random().toString(36).slice(2)),
  name: z.string(),
  muscleGroup: z.enum([
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "core",
    "full_body",
    "other",
  ])
    .default("other"),
  movementType: z.enum(["compound", "isolation", "machine", "free_weight", "bodyweight", "cardio", "other"])
    .default("other"),
  sets: z.array(SetEntrySchema).default([]),
});
export type ExerciseEntry = z.infer<typeof ExerciseEntrySchema>;

export const SectionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).slice(2)),
  type: z.enum(["Set", "Superset", "Circuit"]).default("Set"),
  title: z.string().default("Section"),
  exercises: z.array(ExerciseEntrySchema).default([]),
});
export type SectionEntry = z.infer<typeof SectionSchema>;

export const WorkoutLogSchema = z.object({
  id: z.string(),
  uid: z.string(),
  name: z.string().min(1).default("Workout"),
  date: z.date(), // UI-facing type is Date (DAL converts from/to Firestore)
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  durationSec: z.number().int().nonnegative().default(0),
  notes: z.string().max(2000).optional(),
  sections: z.array(SectionSchema).default([]),
  totalVolume: z.number().nonnegative().default(0), // sum(weight*reps)
});
export type WorkoutLog = z.infer<typeof WorkoutLogSchema>;

/** Utility: compute total volume for a workout (weight * reps across sets). */
export function computeTotalVolume(sections: SectionEntry[]): number {
  let total = 0;
  for (const s of sections) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) total += (set.weight ?? 0) * (set.reps ?? 0);
    }
  }
  return Math.round(total);
}
