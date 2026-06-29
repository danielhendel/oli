import type { ExerciseAcademyPayloadRef } from "../exercise-academy/types";
import { buildMediaExperiencePayloadRef } from "../exercise-media-os/buildMediaExperiencePayloadRef";
import type { ExerciseMediaExperiencePayloadRef } from "../exercise-media-os/types";
import { EXERCISE_ACADEMY_INTELLIGENCE_VERSION } from "../exercise-academy/exerciseAcademyIntelligenceTypes";
import { buildExerciseAcademyPayloadRefForExerciseId } from "../exercise-academy/exerciseAcademyAdapter";
import { getBlockDisplayTitle, mapStudioBlockTypeToJournalBlockType } from "./blockUtils";
import type { WorkoutProjectedVolume } from "./buildWorkoutProjectedVolume";
import { buildWorkoutProjectedVolume } from "./buildWorkoutProjectedVolume";
import { buildWorkoutVolumeAttribution } from "./buildWorkoutVolumeAttribution";
import { listCanonicalWorkoutLibraryExercises } from "./exerciseLibraryAdapter";
import type {
  ExerciseDesignFields,
  ExerciseLoggingSchema,
  ExercisePrescriptionFields,
  WorkoutDesignedSet,
  WorkoutExperience,
} from "./types";

/**
 * Preliminary consumer-app payload — NOT a finalized contract.
 * Maps Workout Studio output toward future mobile workout delivery + journal logging.
 *
 * Target alignment:
 * - blockType → journal block type (warmup | sets | superset | circuit | cooldown | cardio)
 * - exerciseId → journal slot exerciseId
 * - designedSets → planned prescription before session / set logging hints
 * - coachingPayload → in-session education overlay (future)
 * - loggingSchema → enabled fields for strength_set_logged
 */
export type PreliminaryAppWorkoutVolumeAttributionSummary = {
  academyIntelligenceVersion: typeof EXERCISE_ACADEMY_INTELLIGENCE_VERSION;
  totalPrimarySets: number;
  totalSecondarySets: number;
  primaryMuscleSummary: { muscleGroup: string; sets: number }[];
  secondaryMuscleSummary: { muscleGroup: string; sets: number }[];
  missingIntelligenceCount: number;
};

export type PreliminaryAppWorkoutDraftPayload = {
  version: "preliminary-v1";
  workoutTitle: string;
  clientName: string;
  difficulty: WorkoutExperience["difficulty"];
  estimatedDurationMinutes: number | null;
  overview: WorkoutExperience["overview"];
  /** Draft professional projection — not logged execution volume */
  projectedVolume: WorkoutProjectedVolume;
  /** Compact primary/secondary attribution summary for future assignment delivery */
  volumeAttribution: PreliminaryAppWorkoutVolumeAttributionSummary;
  blocks: PreliminaryAppWorkoutDraftBlock[];
};

/** @deprecated — use PreliminaryAppWorkoutDraftPayload */
export type AppWorkoutDraftPayload = PreliminaryAppWorkoutDraftPayload;

export type PreliminaryAppWorkoutDraftExercise = {
  studioCardId: string;
  exerciseId: string | null;
  exerciseName: string;
  source: "canonical" | "custom";
  movementPattern: string | null;
  primaryMuscles: string[];
  equipment: string[];
  designedSets: WorkoutDesignedSet[];
  prescription: ExercisePrescriptionFields;
  coachingPayload: ExerciseDesignFields;
  loggingSchema: ExerciseLoggingSchema;
  progressionRules: string[];
  regressionOptions: string[];
  substitutionOptions: string[];
  /** Compact academy reference — full teaching content fetched separately in future app delivery. */
  exerciseAcademy?: ExerciseAcademyPayloadRef;
  /** Compact media experience reference — full media package fetched separately in future delivery. */
  mediaExperience?: ExerciseMediaExperiencePayloadRef;
};

/** @deprecated — use PreliminaryAppWorkoutDraftExercise */
export type AppWorkoutDraftExercise = PreliminaryAppWorkoutDraftExercise;

export type PreliminaryAppWorkoutDraftBlock = {
  blockId: string;
  blockType: string;
  journalBlockType: ReturnType<typeof mapStudioBlockTypeToJournalBlockType>;
  title: string;
  customTitle: string;
  notes: string;
  order: number;
  exercises: PreliminaryAppWorkoutDraftExercise[];
};

/** @deprecated — use PreliminaryAppWorkoutDraftBlock */
export type AppWorkoutDraftSection = PreliminaryAppWorkoutDraftBlock;

export function buildAppWorkoutDraftPayload(
  workout: WorkoutExperience,
): PreliminaryAppWorkoutDraftPayload {
  const projectedVolume = buildWorkoutProjectedVolume(workout);
  const volumeAttributionRaw = buildWorkoutVolumeAttribution(workout);
  const libraryExercises = listCanonicalWorkoutLibraryExercises();

  const volumeAttribution: PreliminaryAppWorkoutVolumeAttributionSummary = {
    academyIntelligenceVersion: EXERCISE_ACADEMY_INTELLIGENCE_VERSION,
    totalPrimarySets: volumeAttributionRaw.totalPrimarySets,
    totalSecondarySets: volumeAttributionRaw.totalSecondarySets,
    primaryMuscleSummary: volumeAttributionRaw.primary.map((row) => ({
      muscleGroup: row.muscleGroup,
      sets: row.sets,
    })),
    secondaryMuscleSummary: volumeAttributionRaw.secondary.map((row) => ({
      muscleGroup: row.muscleGroup,
      sets: row.sets,
    })),
    missingIntelligenceCount: volumeAttributionRaw.totalExercisesMissingIntelligence,
  };

  return {
    version: "preliminary-v1",
    workoutTitle: workout.title,
    clientName: workout.clientName,
    difficulty: workout.difficulty,
    estimatedDurationMinutes: workout.estimatedDurationMinutes,
    overview: workout.overview,
    projectedVolume,
    volumeAttribution,
    blocks: workout.blocks.map((block) => ({
      blockId: block.id,
      blockType: block.blockType,
      journalBlockType: mapStudioBlockTypeToJournalBlockType(block.blockType),
      title: getBlockDisplayTitle(block),
      customTitle: block.customTitle,
      notes: block.notes,
      order: block.order,
      exercises: block.exercises.map((exercise) => ({
        studioCardId: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        source: exercise.source,
        movementPattern: exercise.movementPattern,
        primaryMuscles: exercise.primaryMuscles,
        equipment: exercise.equipment,
        designedSets: exercise.designedSets,
        prescription: exercise.prescription,
        coachingPayload: exercise.design,
        loggingSchema: exercise.logging,
        progressionRules: exercise.progressionRules.map((rule) => rule.text).filter(Boolean),
        regressionOptions: exercise.regressionOptions,
        substitutionOptions: exercise.substitutionOptions,
        mediaExperience: buildMediaExperiencePayloadRef({
          exerciseId: exercise.exerciseId ?? exercise.mediaComposer.exerciseId,
          exerciseName: exercise.exerciseName,
          composer: exercise.mediaComposer,
        }),
        ...(exercise.source === "canonical" && exercise.exerciseId
          ? {
              exerciseAcademy:
                buildExerciseAcademyPayloadRefForExerciseId(
                  exercise.exerciseId,
                  libraryExercises,
                ) ?? undefined,
            }
          : {}),
      })),
    })),
  };
}
