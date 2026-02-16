// services/normalizer/src/schemas/events.ts
import { z } from "zod";

// Versioned registry of raw events (extend as needed)
export const EventBase = z.object({
  type: z.string(),
  version: z.literal("1"),
  uid: z.string(),
  ts: z.number().int(),
});

export const WorkoutLoggedV1 = EventBase.extend({
  type: z.literal("workout.logged"),
  payload: z.object({
    workoutId: z.string(),
    totalVolume: z.number().nonnegative().optional(),
    exercises: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        muscleGroups: z.array(z.string()).optional(),
        sets: z.array(
          z.object({
            reps: z.number().int().nonnegative(),
            weight: z.number().nonnegative().optional(),
            rpe: z.number().min(0).max(10).optional(),
          })
        ),
      })
    ),
  }),
});

export type WorkoutLogged = z.infer<typeof WorkoutLoggedV1>;

export const REGISTRY: Record<string, z.ZodTypeAny> = {
  "workout.logged:1": WorkoutLoggedV1,
};

export function schemaFor(type: string, version: string) {
  return REGISTRY[`${type}:${version}`];
}
