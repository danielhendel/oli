// lib/data/program/getExerciseSwapOptions.ts
/**
 * Deterministic ranking + swap-option selection for the Program Builder exercise engine. Pure
 * functions only — no IO, no React.
 *
 * Exercises are drawn from the EXISTING library (bundled `EXERCISE_LIBRARY_V1` + optional injected
 * custom records). Ranking is a transparent, deterministic score from training type + level applied
 * to each candidate's equipment / movement / match quality, with `exerciseId` as the final tiebreak
 * so the same inputs always produce the same order. No exercise is ever fabricated.
 */
import {
  getLibraryCandidatesForMuscleGroup,
  PROGRAM_MUSCLE_GROUP_TO_DETAILED,
  type ExerciseLibraryCandidate,
} from "@/lib/data/program/programMuscleGroupExerciseTaxonomy";
import type { ProgramExerciseOption } from "@/lib/data/program/programExerciseRecommendationTypes";
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  TrainingType,
} from "@/lib/data/program/workoutProgramDesignTypes";
import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import {
  canRankExerciseSwapByIntelligence,
  rankExerciseSwapByIntelligence,
  type RankExerciseSwapConstraints,
} from "@/lib/workouts/exercises/intelligence/rankExerciseSwapByIntelligence";
import type { MovementPattern } from "@/lib/workouts/exercises/metadata";
import type { Equipment, MuscleGroupDetailed } from "@/lib/workouts/exercises/taxonomy";

const COMPOUND_MOVEMENTS: ReadonlySet<MovementPattern> = new Set<MovementPattern>([
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "gait",
]);

/** Heuristic skill/complexity (0 = low-skill/safe … 2 = high-skill) derived from equipment+movement. */
function skillComplexity(equipment: Equipment, movement: MovementPattern): number {
  if (equipment === "Machine" || equipment === "Cable" || equipment === "Band") return 0;
  if (movement === "isolation" || movement === "core" || movement === "rotation") return 0.5;
  if (equipment === "Barbell") return movement === "squat" || movement === "hinge" ? 2 : 1.5;
  if (equipment === "Bodyweight") return COMPOUND_MOVEMENTS.has(movement) ? 1 : 0.5;
  return 1;
}

function isCompound(movement: MovementPattern): boolean {
  return COMPOUND_MOVEMENTS.has(movement);
}

/** Training-type preference contribution (higher = preferred earlier in the list). */
function trainingTypeScore(
  type: TrainingType,
  equipment: Equipment,
  movement: MovementPattern,
): number {
  const compound = isCompound(movement);
  switch (type) {
    case "hypertrophy":
      // Stable loading + full-ROM isolation rank well.
      return (
        (equipment === "Machine" || equipment === "Cable" ? 12 : 0) +
        (equipment === "Dumbbell" ? 8 : 0) +
        (movement === "isolation" ? 6 : 0)
      );
    case "strength":
      return (compound ? 14 : -6) + (equipment === "Barbell" ? 12 : equipment === "Dumbbell" ? 4 : 0);
    case "powerlifting":
      return (
        (equipment === "Barbell" ? 16 : 0) +
        (movement === "squat" || movement === "hinge" || movement === "push" ? 12 : 0) +
        (movement === "isolation" ? -8 : 0)
      );
    case "athletic_performance":
      return (
        (movement === "hinge" || movement === "lunge" || movement === "carry" || movement === "gait"
          ? 10
          : 0) +
        (equipment === "Dumbbell" || equipment === "Kettlebell" || equipment === "Bodyweight"
          ? 8
          : 0) +
        (equipment === "Machine" ? -6 : 0) +
        (movement === "isolation" ? -4 : 0)
      );
    case "conditioning":
      // Low-skill, repeatable, fatigue-tolerant.
      return (
        (equipment === "Bodyweight" ? 10 : 0) +
        (equipment === "Machine" ? 6 : 0) +
        (movement === "isolation" || movement === "core" ? 4 : 0) +
        (equipment === "Barbell" ? -8 : 0)
      );
    case "general_fitness":
      // Balanced, safe, easy to learn.
      return (
        (equipment === "Machine" ? 10 : 0) +
        (equipment === "Dumbbell" ? 8 : 0) +
        (equipment === "Cable" ? 6 : 0) +
        (equipment === "Barbell" ? -2 : 0)
      );
  }
}

/** Training-level preference: lower levels favor simpler/safer movements; higher levels allow specialization. */
function trainingLevelScore(
  level: ProgramDesignTrainingLevel,
  complexity: number,
): number {
  switch (level) {
    case "beginner":
      return (2 - complexity) * 10;
    case "novice":
      return (2 - complexity) * 6;
    case "intermediate":
      return (1.5 - complexity) * 2;
    case "advanced":
      return complexity * 3;
    case "elite":
      return complexity * 5;
  }
}

function scoreCandidate(
  option: { equipment: Equipment; movement: MovementPattern; isPrimaryMatch: boolean; origin: "bundled" | "custom" },
  type: TrainingType,
  level: ProgramDesignTrainingLevel,
): number {
  const complexity = skillComplexity(option.equipment, option.movement);
  return (
    (option.isPrimaryMatch ? 100 : 0) +
    (option.origin === "bundled" ? 20 : 0) +
    trainingTypeScore(type, option.equipment, option.movement) +
    trainingLevelScore(level, complexity)
  );
}

function bundledToOption(candidate: ExerciseLibraryCandidate): ProgramExerciseOption {
  return {
    exerciseId: candidate.item.exerciseId,
    name: candidate.item.name,
    equipment: candidate.item.equipment,
    movement: candidate.item.movement,
    isPrimaryMatch: candidate.isPrimaryMatch,
    origin: "bundled",
  };
}

/**
 * Eligibility of a custom (user-created) exercise for a muscle group, based ONLY on its own
 * taxonomy. Returns null when taxonomy is insufficient (we do not guess the target muscle).
 */
function customExerciseOption(
  record: CustomExerciseRecord,
  tags: ReadonlySet<MuscleGroupDetailed>,
): ProgramExerciseOption | null {
  if (tags.size === 0) return null;
  const primaryHit = (record.primaryMusclesDetailed ?? []).some((d) => tags.has(d));
  const secondaryHit = (record.secondaryMusclesDetailed ?? []).some((d) => tags.has(d));
  if (!primaryHit && !secondaryHit) return null;
  return {
    exerciseId: record.exerciseId,
    name: record.name,
    equipment: record.equipment,
    movement: record.movementPattern ?? "isolation",
    isPrimaryMatch: primaryHit,
    origin: "custom",
  };
}

export type ExerciseRankingContext = {
  trainingType: TrainingType;
  trainingLevel: ProgramDesignTrainingLevel;
};

export type SwapOptionsArgs = ExerciseRankingContext & {
  muscleGroupId: ProgramDesignMuscleGroup;
  /**
   * When set and the source has seeded hypertrophy intelligence, candidates are re-ranked
   * with an additive intelligence layer. Omit to use legacy ranking only.
   */
  sourceExerciseId?: string;
  /** Optional intelligence constraints (only applied when source has seeded overlay). */
  intelligenceConstraints?: RankExerciseSwapConstraints;
  /** Optional injected custom exercises (loaded by the screen from the existing custom store). */
  customExercises?: readonly CustomExerciseRecord[];
  /** Optional cap on returned options. Omit to return all real candidates. */
  limit?: number;
};

/** Program Builder slot context for building swap-option args. */
export type ProgramExerciseSwapSlotContext = ExerciseRankingContext & {
  muscleGroupId: ProgramDesignMuscleGroup;
  /** Current slot selection; null/empty keeps legacy ranking. */
  selectedExerciseId: string | null;
  intelligenceConstraints?: RankExerciseSwapConstraints;
  customExercises?: readonly CustomExerciseRecord[];
  limit?: number;
};

/**
 * Build {@link SwapOptionsArgs} for Program Builder exercise selection.
 * Passes `sourceExerciseId` when the slot already has a selection; omits constraints
 * unless caller supplies them from existing program/user context.
 */
export function buildProgramExerciseSwapOptionsArgs(
  context: ProgramExerciseSwapSlotContext,
): SwapOptionsArgs {
  const args: SwapOptionsArgs = {
    muscleGroupId: context.muscleGroupId,
    trainingType: context.trainingType,
    trainingLevel: context.trainingLevel,
    ...(context.customExercises != null ? { customExercises: context.customExercises } : {}),
    ...(context.limit != null ? { limit: context.limit } : {}),
    ...(context.intelligenceConstraints != null
      ? { intelligenceConstraints: context.intelligenceConstraints }
      : {}),
  };

  const selected =
    typeof context.selectedExerciseId === "string" ? context.selectedExerciseId.trim() : "";
  if (selected.length > 0) {
    return { ...args, sourceExerciseId: selected };
  }
  return args;
}

/**
 * Ranked, deterministic swap options for a muscle group, drawn from the existing library. Bundled
 * primary matches rank first, then bundled secondary, then eligible custom exercises (lower-
 * confidence tier). Ties break by `exerciseId` for stable ordering. Never fabricates exercises, so
 * groups with a thin library simply return fewer than {@link MIN_DESIRED_SWAP_OPTIONS} options.
 */
function sortSwapEntries(
  entries: { option: ProgramExerciseOption; score: number }[],
  finalScoreByExerciseId?: ReadonlyMap<string, number>,
): ProgramExerciseOption[] {
  return entries
    .sort((a, b) => {
      const scoreA = finalScoreByExerciseId?.get(a.option.exerciseId) ?? a.score;
      const scoreB = finalScoreByExerciseId?.get(b.option.exerciseId) ?? b.score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Custom exercises always rank below bundled at equal score (separate, lower-confidence tier).
      if (a.option.origin !== b.option.origin) return a.option.origin === "bundled" ? -1 : 1;
      return a.option.exerciseId.localeCompare(b.option.exerciseId);
    })
    .map((entry) => entry.option);
}

export function getExerciseSwapOptions(args: SwapOptionsArgs): ProgramExerciseOption[] {
  const {
    muscleGroupId,
    trainingType,
    trainingLevel,
    sourceExerciseId,
    intelligenceConstraints,
    customExercises = [],
    limit,
  } = args;

  const tags = new Set<MuscleGroupDetailed>(PROGRAM_MUSCLE_GROUP_TO_DETAILED[muscleGroupId]);

  const bundled = getLibraryCandidatesForMuscleGroup(muscleGroupId).map(bundledToOption);
  const custom = customExercises
    .map((record) => customExerciseOption(record, tags))
    .filter((option): option is ProgramExerciseOption => option != null);

  const scored = [...bundled, ...custom].map((option) => ({
    option,
    score: scoreCandidate(option, trainingType, trainingLevel),
  }));

  let finalScoreByExerciseId: Map<string, number> | undefined;
  let swapReasonByExerciseId: Map<
    string,
    { reasonTags: readonly string[]; reasonSummary: string | null }
  > | undefined;
  if (
    typeof sourceExerciseId === "string" &&
    sourceExerciseId.trim().length > 0 &&
    canRankExerciseSwapByIntelligence(sourceExerciseId)
  ) {
    const baseSwapScoresByExerciseId = Object.fromEntries(
      scored.map((entry) => [entry.option.exerciseId, entry.score]),
    );
    const intelligenceRanked = rankExerciseSwapByIntelligence({
      sourceExerciseId,
      candidateExerciseIds: scored.map((entry) => entry.option.exerciseId),
      ...(intelligenceConstraints != null ? { constraints: intelligenceConstraints } : {}),
      baseSwapScoresByExerciseId,
    });
    finalScoreByExerciseId = new Map(
      intelligenceRanked.map((row) => [row.exerciseId, row.breakdown.finalScore]),
    );
    swapReasonByExerciseId = new Map(
      intelligenceRanked.map((row) => [
        row.exerciseId,
        { reasonTags: row.reasonTags, reasonSummary: row.reasonSummary },
      ]),
    );
  }

  const ranked = sortSwapEntries(scored, finalScoreByExerciseId).map((option) => {
    const reasons = swapReasonByExerciseId?.get(option.exerciseId);
    if (reasons == null || reasons.reasonSummary == null) return option;
    return {
      ...option,
      reasonTags: reasons.reasonTags,
      reasonSummary: reasons.reasonSummary,
    };
  });

  return typeof limit === "number" ? ranked.slice(0, Math.max(0, limit)) : ranked;
}
