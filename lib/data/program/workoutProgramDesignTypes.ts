// lib/data/program/workoutProgramDesignTypes.ts
/**
 * Workout "Program Design" — typed client-side draft model.
 *
 * This describes the user's *authoring intent* for a training program (type, level,
 * duration, per-muscle weekly volume, and a weekly split). It is intentionally distinct
 * from canonical logged-workout truth.
 *
 * Persistence: NONE. The draft lives in an in-memory client-side store
 * (see {@link ./workoutProgramDesignStore}); it is not written to Firebase/API and is not
 * read back from the server. Persistence is intentionally deferred until a Program
 * persistence boundary is approved (see lib/data/program/types.ts for the intended
 * `users/{uid}/programs/{programId}` shape). Nothing here performs IO.
 */

/** Program training type/category. */
export type WorkoutProgramType =
  | "hypertrophy"
  | "power_lifting"
  | "strength_training"
  | "functional_training"
  | "circuit_training";

/**
 * Program-design training level. Intentionally distinct from the analytics-domain
 * `TrainingLevel` (3-tier) — this is the authoring taxonomy requested for Program Design (5-tier).
 */
export type ProgramDesignTrainingLevel =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced"
  | "elite";

/**
 * Program-design muscle group taxonomy for weekly volume targeting. This is the *authoring*
 * granularity (chest split into upper/mid, traps as lower traps, etc.) — distinct from both the
 * analytics `MuscleGroup` taxonomy and the legacy program volume taxonomy.
 */
export type ProgramDesignMuscleGroup =
  | "upper_chest"
  | "mid_chest"
  | "lats"
  | "upper_back"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "triceps"
  | "biceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "lower_traps"
  | "rotator_cuff"
  | "adductors"
  | "forearms"
  | "neck"
  | "tibialis";

/** Per-muscle weekly volume (target sets per week). Sparse: absent/0 ⇒ "Not set" for that muscle. */
export type MuscleGroupVolumeMap = Partial<Record<ProgramDesignMuscleGroup, number>>;

/** One configured day in the weekly split. `name` is user-defined (free text). */
export type WeeklySplitDay = {
  /** Stable position id, e.g. "day-1". */
  id: string;
  /** User-entered day name/type (e.g. "Full Body", "Push", "Legs"). May be empty until typed. */
  name: string;
};

/** Weekly split: a chosen number of training days (2–6) and a per-day configuration. */
export type WeeklySplitDraft = {
  /** Number of training days, constrained to {@link WEEKLY_SPLIT_MIN_DAYS}..{@link WEEKLY_SPLIT_MAX_DAYS}. */
  dayCount: number;
  /** One entry per training day, length === dayCount. */
  days: WeeklySplitDay[];
};

/**
 * The complete typed Program Design draft. Every field is nullable/sparse so the UI can
 * represent the "Not set" empty state faithfully without sentinel values.
 */
export type WorkoutProgramDesignDraft = {
  type: WorkoutProgramType | null;
  trainingLevel: ProgramDesignTrainingLevel | null;
  /** Whole weeks, 1..52. Null when not set. */
  durationWeeks: number | null;
  muscleGroupVolume: MuscleGroupVolumeMap;
  weeklySplit: WeeklySplitDraft | null;
};

/** Stable identifier for each Program Design category row. */
export type ProgramDesignCategoryId =
  | "type"
  | "trainingLevel"
  | "duration"
  | "muscleGroupVolume"
  | "weeklySplit";

/** View-model for a single tappable Program Design row. */
export type ProgramDesignRowModel = {
  id: ProgramDesignCategoryId;
  title: string;
  /** Selected value summary, or the empty-state label ("Not set"). */
  valueLabel: string;
  /** Whether a value has been set (drives muted vs primary styling). */
  isSet: boolean;
  /** Destination route for this category's setup page. */
  href: string;
  /** Composed label for screen readers, e.g. "Type, Hypertrophy". */
  accessibilityLabel: string;
};
