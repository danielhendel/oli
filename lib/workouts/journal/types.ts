import { z } from "zod";

/**
 * Workout Journal v1 types.
 * Storage-agnostic, deterministic, and designed for append-only journaling.
 */

export const workoutSessionStatusSchema = z.enum([
  "draft",
  "planned",
  "active",
  "completed",
  "abandoned",
  "archived",
]);
export type WorkoutSessionStatus = z.infer<typeof workoutSessionStatusSchema>;

export const workoutEventSourceSchema = z.enum([
  "manual",
  "import",
  "equipment",
  "apple_health",
]);
export type WorkoutEventSource = z.infer<typeof workoutEventSourceSchema>;

export const isoStringSchema = z
  .string()
  .refine((s) => Number.isFinite(Date.parse(s)), { message: "Invalid ISO date" });

export const deviceTimeZoneSchema = z.string().min(1);

export const baseWorkoutEventSchema = z.object({
  eventId: z.string().min(1),
  ownerUid: z.string().min(1),
  sessionId: z.string().min(1),
  occurredAt: isoStringSchema,
  capturedAt: isoStringSchema,
  deviceTimeZone: deviceTimeZoneSchema,
  source: workoutEventSourceSchema,
  idempotencyKey: z.string().min(1),
});

export const workoutSessionStateChangedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_session_state_changed"),
  payload: z.object({
    from: workoutSessionStatusSchema,
    to: workoutSessionStatusSchema,
    reason: z.enum(["user", "timeout", "system"]).optional(),
    /**
     * When present, reducer uses this ISO time for `startedAt` instead of the event's `occurredAt`.
     * The event still uses wall-clock `occurredAt` for sort order so backfill "active" transitions
     * remain after the draft seed (past anchors must not sort before createSessionDraft).
     */
    sessionStartedAtAnchorIso: isoStringSchema.optional(),
  }),
});
export type WorkoutSessionStateChanged = z.infer<typeof workoutSessionStateChangedSchema>;

export const workoutExerciseAddedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_exercise_added"),
  payload: z.object({
    blockId: z.string().min(1).optional(),
    slotId: z.string().min(1),
    exerciseId: z.string().min(1),
    position: z.number().int().nonnegative(),
    note: z.string().max(2000).optional(),
    /** Snapshot URLs when adding (e.g. from merged custom definition). Log UI still resolves latest by exerciseId. */
    imageUrl: z.string().max(4096).optional(),
    videoUrl: z.string().max(4096).optional(),
  }),
});
export type WorkoutExerciseAdded = z.infer<typeof workoutExerciseAddedSchema>;

export const workoutExerciseRemovedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_exercise_removed"),
  payload: z.object({
    slotId: z.string().min(1),
    reason: z.enum(["user", "template_change"]).optional(),
  }),
});
export type WorkoutExerciseRemoved = z.infer<typeof workoutExerciseRemovedSchema>;

export const strengthSetLoggedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("strength_set_logged"),
  payload: z.object({
    setId: z.string().min(1),
    slotId: z.string().min(1),
    ordinal: z.number().int().positive(),
    reps: z.number().int().positive(),
    loadKg: z.number().positive().optional(),
    rpe: z.number().min(0).max(10).optional(),
    tempo: z.string().max(20).optional(),
    isWarmup: z.boolean().optional(),
    note: z.string().max(2000).optional(),
  }),
});
export type StrengthSetLogged = z.infer<typeof strengthSetLoggedSchema>;

export const strengthSetCorrectedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("strength_set_corrected"),
  payload: z.object({
    setId: z.string().min(1),
    patch: z
      .object({
        reps: z.number().int().positive().optional(),
        loadKg: z.number().positive().optional(),
        rpe: z.number().min(0).max(10).optional(),
        tempo: z.string().max(20).optional(),
        isWarmup: z.boolean().optional(),
        note: z.string().max(2000).optional(),
      })
      .strict(),
    correctionReason: z.enum(["user_edit", "unit_fix", "import_fix"]).optional(),
  }),
});
export type StrengthSetCorrected = z.infer<typeof strengthSetCorrectedSchema>;

export const strengthSetRemovedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("strength_set_removed"),
  payload: z.object({
    setId: z.string().min(1),
    reason: z.enum(["user", "template_change"]).optional(),
  }),
});
export type StrengthSetRemoved = z.infer<typeof strengthSetRemovedSchema>;

export const workoutBlockCreatedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_block_created"),
  payload: z.object({
    blockId: z.string().min(1),
    blockType: z.enum(["warmup", "sets", "superset", "circuit", "cooldown", "cardio"]),
    position: z.number().int().nonnegative(),
    title: z.string().max(500).optional(),
  }),
});
export type WorkoutBlockCreated = z.infer<typeof workoutBlockCreatedSchema>;

export const workoutBlockUpdatedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_block_updated"),
  payload: z.object({
    blockId: z.string().min(1),
    patch: z
      .object({
        blockType: z.enum(["warmup", "sets", "superset", "circuit", "cooldown", "cardio"]).optional(),
        title: z.string().max(500).optional(),
      })
      .strict(),
    reason: z.enum(["user", "template_change"]).optional(),
  }),
});
export type WorkoutBlockUpdated = z.infer<typeof workoutBlockUpdatedSchema>;

export const workoutBlockRemovedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_block_removed"),
  payload: z.object({
    blockId: z.string().min(1),
    reason: z.enum(["user", "template_change"]).optional(),
  }),
});
export type WorkoutBlockRemoved = z.infer<typeof workoutBlockRemovedSchema>;

export const workoutNoteAddedSchema = baseWorkoutEventSchema.extend({
  kind: z.literal("workout_note_added"),
  payload: z.object({
    note: z.string().min(1).max(10_000),
  }),
});
export type WorkoutNoteAdded = z.infer<typeof workoutNoteAddedSchema>;

export const workoutEventV1Schema = z.discriminatedUnion("kind", [
  workoutSessionStateChangedSchema,
  workoutExerciseAddedSchema,
  workoutExerciseRemovedSchema,
  workoutBlockCreatedSchema,
  workoutBlockUpdatedSchema,
  workoutBlockRemovedSchema,
  strengthSetLoggedSchema,
  strengthSetCorrectedSchema,
  strengthSetRemovedSchema,
  workoutNoteAddedSchema,
]);
export type WorkoutEventV1 = z.infer<typeof workoutEventV1Schema>;

/**
 * Stored journal record v1. This is what we persist in AsyncStorage.
 * Fail-closed: invalid records are dropped during load.
 */
export const storedJournalRecordSchema = z.object({
  v: z.literal(1),
  e: workoutEventV1Schema,
});
export type StoredJournalRecordV1 = z.infer<typeof storedJournalRecordSchema>;

/**
 * Session view state derived from events (reducer output).
 * This is a minimal deterministic "engine state", not a UI VM.
 */
export type ReducedSessionV1 = {
  ownerUid: string;
  sessionId: string;
  status: WorkoutSessionStatus;
  /**
   * ISO time for the workout start used by summaries: first transition to "active" uses
   * `sessionStartedAtAnchorIso` from that event when set, else the event's `occurredAt`; if none, earliest event time.
   */
  startedAt: string | null;
  blocks: { blockId: string; blockType: string; position: number; title: string; removed: boolean }[];
  exercises: {
    slotId: string;
    blockId: string | null;
    exerciseId: string;
    position: number;
    removed: boolean;
    /** From `workout_exercise_added` snapshot when present (optional for older journals). */
    imageUrl?: string;
    videoUrl?: string;
    sets: {
      setId: string;
      ordinal: number;
      reps: number;
      loadKg: number | null;
      rpe: number | null;
      tempo: string | null;
      isWarmup: boolean;
      note: string | null;
      occurredAt: string;
    }[];
  }[];
  notes: string[];
  // For debugging / determinism proofs (no PII beyond ids)
  eventCount: number;
};
