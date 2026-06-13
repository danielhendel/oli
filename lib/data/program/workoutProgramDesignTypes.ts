// lib/data/program/workoutProgramDesignTypes.ts
/**
 * Workout "Program Design" — typed client-side draft model + base taxonomies.
 *
 * This describes the user's *authoring intent* for a training program. The six inputs
 * (Sex, Age, Training Level, Training Days, Goal, Training Type) feed a deterministic
 * Programming Engine (see {@link ./buildProgrammingPrescription}) that generates weekly
 * sets-by-muscle, frequency, rep ranges, RIR/RPE targets, a progression model, and a
 * training-day split. The user can then manually customize the generated prescription.
 *
 * Persistence: NONE. The draft lives in an in-memory client-side store
 * (see {@link ./workoutProgramDesignStore}); it is not written to Firebase/API and is not
 * read back from the server. Persistence is intentionally deferred until a Program
 * persistence boundary is approved (see lib/data/program/types.ts for the intended
 * `users/{uid}/programs/{programId}` shape). Nothing here performs IO.
 */

/**
 * Training type — the programming style the engine optimizes for. Drives volume multipliers,
 * rep ranges, RIR/RPE targets, and the progression model.
 */
export type TrainingType =
  | "general_fitness"
  | "hypertrophy"
  | "strength"
  | "powerlifting"
  | "athletic_performance"
  | "conditioning";

/**
 * Program goal — the user's headline objective. Captured as context for the program; the
 * volume/intensity math is driven by sex + level + training type + training days per the
 * engine spec, so goal is informational (it does not currently alter the prescription math).
 */
export type ProgramGoal =
  | "general_health"
  | "build_muscle"
  | "gain_strength"
  | "lose_fat"
  | "athletic_performance";

/**
 * Program-design training level. Intentionally distinct from the analytics-domain
 * `TrainingLevel` (3-tier) — this is the authoring taxonomy for Program Design (5-tier).
 */
export type ProgramDesignTrainingLevel =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced"
  | "elite";

/** Sex dimension for the base volume tables (only Male/Female tables exist). */
export type ProgramVolumeSex = "male" | "female";

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

/**
 * The complete typed Program Design draft. Every input is nullable so the UI can represent the
 * "Not set" empty state faithfully. The generated prescription is derived purely from these
 * inputs; manual customizations are stored as sparse overrides that survive regeneration.
 */
export type WorkoutProgramDesignDraft = {
  sex: ProgramVolumeSex | null;
  /** Whole years; informational context for the program. Null when not set. */
  age: number | null;
  trainingLevel: ProgramDesignTrainingLevel | null;
  /** Training days per week, constrained to 2..6. Null when not set. */
  trainingDays: number | null;
  goal: ProgramGoal | null;
  trainingType: TrainingType | null;
  /**
   * Manual per-muscle weekly-set overrides. Empty by default; a key is present only when the
   * user has personalized that muscle with the -/+ controls. Overrides win over the engine's
   * generated value and persist across input changes ("manual override survives generation").
   */
  muscleVolumeOverrides: MuscleGroupVolumeMap;
  /**
   * Manual weekly-split day-name overrides, keyed by stable day id ("day-1"...). Present only
   * when the user renames a generated day. Survives regeneration like volume overrides.
   */
  splitDayNameOverrides: Record<string, string>;
  /**
   * Manual per-muscle weekly-frequency overrides (times trained per week). Present only when the
   * user edits frequency on a muscle group page; wins over the engine value and survives regen.
   */
  frequencyOverrides: MuscleGroupVolumeMap;
  /**
   * Manual per-muscle exercise-count overrides (number of exercise slots). Present only when the
   * user edits "Number of exercises"; wins over the engine default and survives regeneration.
   */
  exerciseCountOverrides: MuscleGroupVolumeMap;
  /**
   * Manual per-muscle training-day assignment overrides (stable day ids, e.g. "day-1"). Present only
   * when the user picks specific days on the muscle group training-days edit page.
   */
  trainingDayOverrides: Partial<Record<ProgramDesignMuscleGroup, string[]>>;
  /**
   * Manual per-slot exercise selections, keyed by muscle group then stable slot id
   * ("upper_chest-slot-1"...). A value is the chosen exercise's stable library id. Present only when
   * the user selects/swaps an exercise; survives regeneration.
   */
  exerciseSelectionOverrides: ExerciseSelectionOverrideMap;
  /**
   * Manual per-slot training-day assignments, keyed by muscle group then stable slot id. A value is
   * the stable split day id ("day-1"...) the user moved the slot to. Present only when the user
   * moves an exercise from the day workout page; wins over the engine assignment and survives regen.
   */
  slotDayOverrides: SlotDayOverrideMap;
};

/** Manual exercise selections: muscle group → slot id → stable exercise id. Sparse. */
export type ExerciseSelectionOverrideMap = Partial<
  Record<ProgramDesignMuscleGroup, Record<string, string>>
>;

/** Manual slot→day moves: muscle group → slot id → stable split day id. Sparse. */
export type SlotDayOverrideMap = Partial<
  Record<ProgramDesignMuscleGroup, Record<string, string>>
>;

/** Stable identifier for each Program Design category row. */
export type ProgramDesignCategoryId =
  | "sex"
  | "age"
  | "trainingLevel"
  | "trainingDays"
  | "goal"
  | "trainingType";

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
  /** Composed label for screen readers, e.g. "Training Type, Hypertrophy". */
  accessibilityLabel: string;
};
