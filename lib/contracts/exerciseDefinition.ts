/**
 * User-owned exercise definitions stored at Firestore:
 *   users/{uid}/exerciseDefinitions/{exerciseId}
 *
 * Shape aligns with client `CustomExerciseRecord` for merge/display.
 * API validates writes; clients use lib/api (no direct Firestore).
 */
import { z } from "zod";
import { isoDateTimeStringSchema } from "./rawEvent";

export const exerciseDefinitionEquipmentSchema = z.enum([
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Band",
  "MedicineBall",
  "Sled",
  "CardioMachine",
  "Other",
]);

export const exerciseDefinitionLoggingTypeSchema = z.enum([
  "weight_reps",
  "reps_only",
  "time",
  "distance",
  "bodyweight_reps",
  "custom",
]);

export const exerciseDefinitionPrimarySchema = z.union([
  z.enum(["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core", "Full body"]),
  z.literal("Other"),
]);

/** Mirrors bundled `MovementPattern` strings (additive on user definitions). */
export const exerciseDefinitionMovementPatternSchema = z.enum([
  "push",
  "pull",
  "squat",
  "hinge",
  "carry",
  "core",
  "isolation",
  "lunge",
  "rotation",
  "gait",
]);

/**
 * Support / stability context for analytics (orthogonal to equipment "Machine").
 * - `machine`: fixed path / external support (selectorized, Smith locked track, etc.)
 * - `free`: free-weight or self-stabilized motion
 */
export const exerciseDefinitionStabilitySchema = z.enum(["machine", "free"]);

export type ExerciseDefinitionStability = z.infer<typeof exerciseDefinitionStabilitySchema>;

export const exerciseDefinitionLateralitySchema = z.enum(["unilateral", "bilateral"]);

export type ExerciseDefinitionLaterality = z.infer<typeof exerciseDefinitionLateralitySchema>;

const urlishStringSchema = z.string().max(2048);

export const exerciseDefinitionMuscleContributionEntrySchema = z
  .object({
    subgroup: z.string().min(1).max(64),
    weight: z.number().finite().nonnegative(),
  })
  .strict();

/** Row returned by GET /exercise-definitions (matches app CustomExerciseRecord). */
export const exerciseDefinitionRowSchema = z
  .object({
    exerciseId: z.string().min(1).max(200),
    name: z.string().min(1).max(80),
    equipment: exerciseDefinitionEquipmentSchema,
    primary: exerciseDefinitionPrimarySchema,
    loggingType: exerciseDefinitionLoggingTypeSchema,
    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema,
    aliases: z.array(z.string().min(1).max(80)).max(40).optional(),
    movementPattern: exerciseDefinitionMovementPatternSchema.optional(),
    primaryMusclesDetailed: z.array(z.string().min(1).max(64)).max(40).optional(),
    secondaryMusclesDetailed: z.array(z.string().min(1).max(64)).max(40).optional(),
    muscleContributions: z.array(exerciseDefinitionMuscleContributionEntrySchema).max(40).optional(),
    stability: exerciseDefinitionStabilitySchema.nullable().optional(),
    laterality: exerciseDefinitionLateralitySchema.nullable().optional(),
    imageUrl: urlishStringSchema.optional(),
    videoUrl: urlishStringSchema.optional(),
    mediaUrl: urlishStringSchema.optional(),
  })
  .strict();

export type ExerciseDefinitionRow = z.infer<typeof exerciseDefinitionRowSchema>;

/** Stored document body (includes schema version for forward migrations). */
export const exerciseDefinitionFirestoreDocSchema = exerciseDefinitionRowSchema.extend({
  schemaVersion: z.literal(1),
});

export type ExerciseDefinitionFirestoreDoc = z.infer<typeof exerciseDefinitionFirestoreDocSchema>;

export const exerciseDefinitionListResponseSchema = z
  .object({
    items: z.array(exerciseDefinitionRowSchema),
  })
  .strict();

export type ExerciseDefinitionListResponse = z.infer<typeof exerciseDefinitionListResponseSchema>;

export const exerciseDefinitionCreateBodySchema = z
  .object({
    name: z.string().min(1).max(80),
    equipment: exerciseDefinitionEquipmentSchema,
    primary: exerciseDefinitionPrimarySchema,
    loggingType: exerciseDefinitionLoggingTypeSchema,
    /** When migrating from device storage, preserve stable custom_* ids owned by this user. */
    exerciseId: z.string().min(1).max(200).optional(),
    aliases: z.array(z.string().min(1).max(80)).max(40).optional(),
    movementPattern: exerciseDefinitionMovementPatternSchema.optional(),
    primaryMusclesDetailed: z.array(z.string().min(1).max(64)).max(40).optional(),
    secondaryMusclesDetailed: z.array(z.string().min(1).max(64)).max(40).optional(),
    muscleContributions: z.array(exerciseDefinitionMuscleContributionEntrySchema).max(40).optional(),
    stability: exerciseDefinitionStabilitySchema.nullable().optional(),
    laterality: exerciseDefinitionLateralitySchema.nullable().optional(),
    imageUrl: urlishStringSchema.optional(),
    videoUrl: urlishStringSchema.optional(),
    mediaUrl: urlishStringSchema.optional(),
  })
  .strict();

export type ExerciseDefinitionCreateBody = z.infer<typeof exerciseDefinitionCreateBodySchema>;

export const exerciseDefinitionUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    equipment: exerciseDefinitionEquipmentSchema.optional(),
    primary: exerciseDefinitionPrimarySchema.optional(),
    loggingType: exerciseDefinitionLoggingTypeSchema.optional(),
    aliases: z.array(z.string().min(1).max(80)).max(40).optional(),
    movementPattern: exerciseDefinitionMovementPatternSchema.optional(),
    primaryMusclesDetailed: z.array(z.string().min(1).max(64)).max(40).optional(),
    secondaryMusclesDetailed: z.array(z.string().min(1).max(64)).max(40).optional(),
    muscleContributions: z.array(exerciseDefinitionMuscleContributionEntrySchema).max(40).optional(),
    stability: exerciseDefinitionStabilitySchema.nullable().optional(),
    laterality: exerciseDefinitionLateralitySchema.nullable().optional(),
    imageUrl: urlishStringSchema.optional(),
    videoUrl: urlishStringSchema.optional(),
    mediaUrl: urlishStringSchema.optional(),
  })
  .strict()
  .refine(
    (o) =>
      o.name !== undefined ||
      o.equipment !== undefined ||
      o.primary !== undefined ||
      o.loggingType !== undefined ||
      o.aliases !== undefined ||
      o.movementPattern !== undefined ||
      o.primaryMusclesDetailed !== undefined ||
      o.secondaryMusclesDetailed !== undefined ||
      o.muscleContributions !== undefined ||
      o.stability !== undefined ||
      o.laterality !== undefined ||
      o.imageUrl !== undefined ||
      o.videoUrl !== undefined ||
      o.mediaUrl !== undefined,
    { message: "At least one field is required" },
  );

export type ExerciseDefinitionUpdateBody = z.infer<typeof exerciseDefinitionUpdateBodySchema>;

/** POST /exercise-definitions/:exerciseId/media — Firebase Storage URL with download token. */
export const exerciseDefinitionMediaSlotSchema = z.enum(["image", "video"]);
export type ExerciseDefinitionMediaSlot = z.infer<typeof exerciseDefinitionMediaSlotSchema>;

export const exerciseDefinitionMediaUploadBodySchema = z
  .object({
    slot: exerciseDefinitionMediaSlotSchema,
    fileBase64: z.string().min(1),
    mimeType: z.string().min(3).max(120),
    filename: z.string().min(1).max(200),
  })
  .strict();

export type ExerciseDefinitionMediaUploadBody = z.infer<typeof exerciseDefinitionMediaUploadBodySchema>;

export const exerciseDefinitionMediaUploadResponseSchema = z
  .object({
    url: urlishStringSchema,
    slot: exerciseDefinitionMediaSlotSchema,
  })
  .strict();

export type ExerciseDefinitionMediaUploadResponse = z.infer<typeof exerciseDefinitionMediaUploadResponseSchema>;

// ---------------------------------------------------------------------------
// Stable custom_* id helpers (shared with client AsyncStorage store)
// ---------------------------------------------------------------------------

export function exerciseDefinitionUidPart(uid: string): string {
  return uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase() || "user";
}

export function exerciseSlugFromName(name: string): string {
  const slug = name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length > 0 ? slug.slice(0, 48) : "exercise";
}

/**
 * Deterministic custom id: `custom_{uidPart}_{slug}` with numeric suffix on collision.
 */
export function buildStableCustomExerciseId(
  uid: string,
  name: string,
  existingIds: Iterable<string>,
): string {
  const uidPart = exerciseDefinitionUidPart(uid);
  const existing = new Set(existingIds);
  const base = `custom_${uidPart}_${exerciseSlugFromName(name)}`;
  if (!existing.has(base)) return base;
  let i = 2;
  for (;;) {
    const candidate = `${base}_${i}`;
    if (!existing.has(candidate)) return candidate;
    i += 1;
  }
}

const CUSTOM_ID_RE = /^custom_[a-z0-9_]+$/;

export function isUserScopedCustomExerciseId(uid: string, exerciseId: string): boolean {
  if (!CUSTOM_ID_RE.test(exerciseId)) return false;
  const prefix = `custom_${exerciseDefinitionUidPart(uid)}_`;
  return exerciseId.startsWith(prefix);
}
