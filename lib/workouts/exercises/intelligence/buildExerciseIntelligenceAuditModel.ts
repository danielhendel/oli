/**
 * Pure audit model for bundled ExerciseIntelligenceV1 (Hypertrophy Core).
 * No IO, no React, no Firebase.
 */

import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { auditExerciseIntelligenceScoringBatch } from "./exerciseIntelligenceScoring";
import { HYPERTROPHY_CORE_INTELLIGENCE_V1 } from "./hypertrophyCoreV1";
import type { ExerciseIntelligenceV1, RegionalStimulusV1 } from "./exerciseIntelligenceV1Types";

export const MAJOR_HYPERTROPHY_REGION_KEYS = [
  "upperChest",
  "midChest",
  "lowerChest",
  "lats",
  "upperBack",
  "rearDelts",
  "sideDelts",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "forearms",
  "tibialis",
] as const satisfies readonly (keyof RegionalStimulusV1)[];

export type MajorHypertrophyRegionKey = (typeof MAJOR_HYPERTROPHY_REGION_KEYS)[number];

export type ExerciseIntelligenceAuditRankedExercise = {
  exerciseId: string;
  score: number;
};

export type ExerciseIntelligenceJointStressAudit = {
  lumbar: ExerciseIntelligenceAuditRankedExercise[];
  shoulder: ExerciseIntelligenceAuditRankedExercise[];
  knee: ExerciseIntelligenceAuditRankedExercise[];
};

export type ExerciseIntelligenceAuditModel = {
  totalLibraryExercises: number;
  seededIntelligenceCount: number;
  coveragePercent: number;
  seededByRegion: Record<MajorHypertrophyRegionKey, number>;
  topSfrExercises: ExerciseIntelligenceAuditRankedExercise[];
  highestFatigueExercises: ExerciseIntelligenceAuditRankedExercise[];
  highestJointStressExercises: ExerciseIntelligenceJointStressAudit;
  missingMajorRegionCoverage: MajorHypertrophyRegionKey[];
  scoringAuditIssueCount: number;
};

const TOP_N = 10;

function rankByScoreDesc(
  rows: readonly ExerciseIntelligenceV1[],
  scoreFor: (row: ExerciseIntelligenceV1) => number,
  limit = TOP_N,
): ExerciseIntelligenceAuditRankedExercise[] {
  return [...rows]
    .map((row) => ({ exerciseId: row.exerciseId, score: scoreFor(row) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.exerciseId.localeCompare(b.exerciseId);
    })
    .slice(0, limit);
}

function countSeededByRegion(
  rows: readonly ExerciseIntelligenceV1[],
): Record<MajorHypertrophyRegionKey, number> {
  const counts = Object.fromEntries(
    MAJOR_HYPERTROPHY_REGION_KEYS.map((key) => [key, 0]),
  ) as Record<MajorHypertrophyRegionKey, number>;

  for (const row of rows) {
    for (const key of MAJOR_HYPERTROPHY_REGION_KEYS) {
      const value = row.stimulus[key];
      if (typeof value === "number" && value > 0) counts[key] += 1;
    }
  }
  return counts;
}

function missingRegions(
  seededByRegion: Record<MajorHypertrophyRegionKey, number>,
): MajorHypertrophyRegionKey[] {
  return MAJOR_HYPERTROPHY_REGION_KEYS.filter((key) => seededByRegion[key] === 0);
}

/** Build a deterministic internal audit snapshot for Hypertrophy Core intelligence. */
export function buildExerciseIntelligenceAuditModel(): ExerciseIntelligenceAuditModel {
  const totalLibraryExercises = EXERCISE_LIBRARY_V1.length;
  const seededIntelligenceCount = HYPERTROPHY_CORE_INTELLIGENCE_V1.length;
  const coveragePercent =
    totalLibraryExercises > 0
      ? Math.round((seededIntelligenceCount / totalLibraryExercises) * 1000) / 10
      : 0;

  const seededByRegion = countSeededByRegion(HYPERTROPHY_CORE_INTELLIGENCE_V1);
  const scoringAuditIssueCount = auditExerciseIntelligenceScoringBatch(
    HYPERTROPHY_CORE_INTELLIGENCE_V1,
  ).length;

  return {
    totalLibraryExercises,
    seededIntelligenceCount,
    coveragePercent,
    seededByRegion,
    topSfrExercises: rankByScoreDesc(
      HYPERTROPHY_CORE_INTELLIGENCE_V1,
      (row) => row.stimulusToFatigueRatio,
    ),
    highestFatigueExercises: rankByScoreDesc(
      HYPERTROPHY_CORE_INTELLIGENCE_V1,
      (row) => row.fatigue,
    ),
    highestJointStressExercises: {
      lumbar: rankByScoreDesc(
        HYPERTROPHY_CORE_INTELLIGENCE_V1,
        (row) => row.jointStress.lumbarStress ?? 0,
      ),
      shoulder: rankByScoreDesc(
        HYPERTROPHY_CORE_INTELLIGENCE_V1,
        (row) => row.jointStress.shoulderStress ?? 0,
      ),
      knee: rankByScoreDesc(
        HYPERTROPHY_CORE_INTELLIGENCE_V1,
        (row) => row.jointStress.kneeStress ?? 0,
      ),
    },
    missingMajorRegionCoverage: missingRegions(seededByRegion),
    scoringAuditIssueCount,
  };
}
