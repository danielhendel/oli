import { getExerciseAcademyIntelligenceById } from "../exercise-academy/exerciseAcademyIntelligenceRegistry";
import type { JointKind, StressLevel } from "../exercise-academy/exerciseAcademyIntelligenceTypes";
import type { MuscleGroup } from "@oli/lib/workouts/exercises/taxonomy";

import { getBlockDisplayTitle, mapStudioBlockTypeToJournalBlockType } from "./blockUtils";
import { buildWorkoutProjectedVolume } from "./buildWorkoutProjectedVolume";
import {
  formatMuscleGroupLabel,
  mapMuscleGroupCoarseToMuscleGroup,
  resolvePrimaryMuscleGroupForStudioExercise,
} from "./muscleGroupAdapter";
import type { WorkoutExperience } from "./types";

export type VolumeAttributionContributor = {
  exerciseId?: string;
  exerciseName: string;
  blockId: string;
  blockTitle: string;
  sets: number;
};

export type MuscleVolumeAttribution = {
  muscleGroup: string;
  muscleGroupKey?: MuscleGroup;
  sets: number;
  contributors: VolumeAttributionContributor[];
};

export type StabilizerAttribution = {
  stabilizer: string;
  exposureCount: number;
  contributors: VolumeAttributionContributor[];
};

export type JointStressAttribution = {
  joint: JointKind;
  stressLevel: StressLevel;
  exposureCount: number;
  contributors: (VolumeAttributionContributor & { note: string })[];
};

export type WorkoutVolumeAttribution = {
  primary: MuscleVolumeAttribution[];
  secondary: MuscleVolumeAttribution[];
  stabilizers: StabilizerAttribution[];
  jointStress: JointStressAttribution[];
  totalPrimarySets: number;
  totalSecondarySets: number;
  totalExercisesWithIntelligence: number;
  totalExercisesMissingIntelligence: number;
  missingIntelligenceExerciseIds: string[];
};

type ExerciseContext = {
  exerciseId?: string;
  exerciseName: string;
  blockId: string;
  blockTitle: string;
  setCount: number;
  source: "canonical" | "custom";
  primaryMuscles: string[];
};

function isStrengthBlock(blockType: WorkoutExperience["blocks"][number]["blockType"]): boolean {
  const journalType = mapStudioBlockTypeToJournalBlockType(blockType);
  return journalType === "sets" || journalType === "superset" || journalType === "circuit";
}

function normalizeMuscleLabel(label: string): string {
  const mapped = mapMuscleGroupCoarseToMuscleGroup(label);
  if (mapped != null) return formatMuscleGroupLabel(mapped);
  return label;
}

function muscleKeyFromLabel(label: string): MuscleGroup | undefined {
  return mapMuscleGroupCoarseToMuscleGroup(label) ?? undefined;
}

function sortMuscleRows(rows: MuscleVolumeAttribution[]): MuscleVolumeAttribution[] {
  return [...rows].sort((a, b) => {
    if (b.sets !== a.sets) return b.sets - a.sets;
    return a.muscleGroup.localeCompare(b.muscleGroup);
  });
}

function sortStabilizers(rows: StabilizerAttribution[]): StabilizerAttribution[] {
  return [...rows].sort((a, b) => {
    if (b.exposureCount !== a.exposureCount) return b.exposureCount - a.exposureCount;
    return a.stabilizer.localeCompare(b.stabilizer);
  });
}

function sortJointStress(rows: JointStressAttribution[]): JointStressAttribution[] {
  const stressRank: Record<StressLevel, number> = { high: 3, moderate: 2, low: 1 };
  return [...rows].sort((a, b) => {
    const levelDiff = stressRank[b.stressLevel] - stressRank[a.stressLevel];
    if (levelDiff !== 0) return levelDiff;
    if (b.exposureCount !== a.exposureCount) return b.exposureCount - a.exposureCount;
    return a.joint.localeCompare(b.joint);
  });
}

function sortContributors(rows: VolumeAttributionContributor[]): VolumeAttributionContributor[] {
  return [...rows].sort((a, b) => {
    if (b.sets !== a.sets) return b.sets - a.sets;
    if (a.blockTitle !== b.blockTitle) return a.blockTitle.localeCompare(b.blockTitle);
    return a.exerciseName.localeCompare(b.exerciseName);
  });
}

function addMuscleCredit(
  map: Map<string, MuscleVolumeAttribution>,
  muscleLabel: string,
  contributor: VolumeAttributionContributor,
): void {
  const normalized = normalizeMuscleLabel(muscleLabel);
  const key = muscleKeyFromLabel(muscleLabel);
  const existing = map.get(normalized);
  if (existing) {
    existing.sets += contributor.sets;
    existing.contributors.push(contributor);
    return;
  }
  map.set(normalized, {
    muscleGroup: normalized,
    muscleGroupKey: key,
    sets: contributor.sets,
    contributors: [contributor],
  });
}

function addStabilizerCredit(
  map: Map<string, StabilizerAttribution>,
  stabilizer: string,
  contributor: VolumeAttributionContributor,
): void {
  const existing = map.get(stabilizer);
  if (existing) {
    existing.exposureCount += 1;
    existing.contributors.push(contributor);
    return;
  }
  map.set(stabilizer, {
    stabilizer,
    exposureCount: 1,
    contributors: [contributor],
  });
}

function addJointCredit(
  map: Map<string, JointStressAttribution>,
  joint: JointKind,
  stressLevel: StressLevel,
  note: string,
  contributor: VolumeAttributionContributor,
): void {
  const key = `${joint}:${stressLevel}`;
  const existing = map.get(key);
  const enriched = { ...contributor, note };
  if (existing) {
    existing.exposureCount += 1;
    existing.contributors.push(enriched);
    return;
  }
  map.set(key, {
    joint,
    stressLevel,
    exposureCount: 1,
    contributors: [enriched],
  });
}

function collectStrengthExercises(workout: WorkoutExperience): ExerciseContext[] {
  const rows: ExerciseContext[] = [];
  for (const block of workout.blocks) {
    if (!isStrengthBlock(block.blockType)) continue;
    const blockTitle = getBlockDisplayTitle(block);
    for (const exercise of block.exercises) {
      const setCount = exercise.designedSets.length;
      if (setCount === 0) continue;
      rows.push({
        exerciseId: exercise.exerciseId ?? undefined,
        exerciseName: exercise.exerciseName || "Unnamed exercise",
        blockId: block.id,
        blockTitle,
        setCount,
        source: exercise.source,
        primaryMuscles: exercise.primaryMuscles,
      });
    }
  }
  return rows;
}

/**
 * Draft volume attribution for professional workout design.
 * Primary uses Academy Intelligence when available; falls back to projected volume logic.
 * Secondary, stabilizers, and joint stress require intelligence overlay data.
 */
export function buildWorkoutVolumeAttribution(workout: WorkoutExperience): WorkoutVolumeAttribution {
  const fallbackVolume = buildWorkoutProjectedVolume(workout);
  const primaryMap = new Map<string, MuscleVolumeAttribution>();
  const secondaryMap = new Map<string, MuscleVolumeAttribution>();
  const stabilizerMap = new Map<string, StabilizerAttribution>();
  const jointMap = new Map<string, JointStressAttribution>();

  const missingIntelligenceExerciseIds = new Set<string>();
  let totalExercisesWithIntelligence = 0;
  let totalExercisesMissingIntelligence = 0;
  let totalPrimarySets = 0;
  let totalSecondarySets = 0;

  const exercises = collectStrengthExercises(workout);

  for (const ctx of exercises) {
    const contributor: VolumeAttributionContributor = {
      exerciseId: ctx.exerciseId,
      exerciseName: ctx.exerciseName,
      blockId: ctx.blockId,
      blockTitle: ctx.blockTitle,
      sets: ctx.setCount,
    };

    const intelligence =
      ctx.exerciseId != null ? getExerciseAcademyIntelligenceById(ctx.exerciseId) : null;

    if (intelligence) {
      totalExercisesWithIntelligence += 1;

      for (const muscle of intelligence.primaryMuscles) {
        addMuscleCredit(primaryMap, muscle, contributor);
      }
      if (intelligence.primaryMuscles.length > 0) {
        totalPrimarySets += ctx.setCount;
      }

      for (const muscle of intelligence.secondaryMuscles) {
        addMuscleCredit(secondaryMap, muscle, contributor);
      }
      if (intelligence.secondaryMuscles.length > 0) {
        totalSecondarySets += ctx.setCount;
      }

      for (const stabilizer of intelligence.stabilizers) {
        addStabilizerCredit(stabilizerMap, stabilizer, contributor);
      }

      for (const joint of intelligence.jointConsiderations) {
        addJointCredit(jointMap, joint.joint, joint.stressLevel, joint.note, contributor);
      }
    } else {
      if (ctx.exerciseId) {
        missingIntelligenceExerciseIds.add(ctx.exerciseId);
      }
      totalExercisesMissingIntelligence += 1;

      const fallbackPrimary = resolvePrimaryMuscleGroupForStudioExercise({
        exerciseId: ctx.exerciseId ?? null,
        source: ctx.source,
        primaryMuscles: ctx.primaryMuscles,
      });

      if (fallbackPrimary != null) {
        addMuscleCredit(primaryMap, formatMuscleGroupLabel(fallbackPrimary), contributor);
        totalPrimarySets += ctx.setCount;
      } else {
        const fallbackRow = fallbackVolume.contributors.find(
          (row) =>
            row.blockId === ctx.blockId &&
            row.exerciseName === ctx.exerciseName &&
            row.sets === ctx.setCount,
        );
        if (fallbackRow) {
          addMuscleCredit(primaryMap, fallbackRow.muscleGroup, contributor);
          totalPrimarySets += ctx.setCount;
        }
      }
    }
  }

  const primary = sortMuscleRows(
    [...primaryMap.values()].map((row) => ({
      ...row,
      contributors: sortContributors(row.contributors),
    })),
  );

  const secondary = sortMuscleRows(
    [...secondaryMap.values()].map((row) => ({
      ...row,
      contributors: sortContributors(row.contributors),
    })),
  );

  const stabilizers = sortStabilizers(
    [...stabilizerMap.values()].map((row) => ({
      ...row,
      contributors: sortContributors(row.contributors),
    })),
  );

  const jointStress = sortJointStress(
    [...jointMap.values()].map((row) => ({
      ...row,
      contributors: row.contributors.sort((a, b) => {
        if (b.sets !== a.sets) return b.sets - a.sets;
        return a.exerciseName.localeCompare(b.exerciseName);
      }),
    })),
  );

  return {
    primary,
    secondary,
    stabilizers,
    jointStress,
    totalPrimarySets,
    totalSecondarySets,
    totalExercisesWithIntelligence,
    totalExercisesMissingIntelligence,
    missingIntelligenceExerciseIds: [...missingIntelligenceExerciseIds].sort((a, b) =>
      a.localeCompare(b),
    ),
  };
}
