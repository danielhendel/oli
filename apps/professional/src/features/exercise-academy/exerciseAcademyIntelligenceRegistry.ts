import { TOP20_EXERCISE_ACADEMY_INTELLIGENCE } from "./data/top20ExerciseAcademyIntelligence";
import type {
  ExerciseAcademyIntelligenceEntry,
  IntelligenceCoverage,
} from "./exerciseAcademyIntelligenceTypes";

const INTELLIGENCE_BY_ID = new Map<string, ExerciseAcademyIntelligenceEntry>(
  TOP20_EXERCISE_ACADEMY_INTELLIGENCE.map((entry) => [entry.exerciseId, entry]),
);

export function getExerciseAcademyIntelligenceById(
  exerciseId: string,
): ExerciseAcademyIntelligenceEntry | null {
  return INTELLIGENCE_BY_ID.get(exerciseId) ?? null;
}

export function hasExerciseAcademyIntelligence(exerciseId: string): boolean {
  return INTELLIGENCE_BY_ID.has(exerciseId);
}

export function listExerciseAcademyIntelligenceEntries(): ExerciseAcademyIntelligenceEntry[] {
  return [...TOP20_EXERCISE_ACADEMY_INTELLIGENCE].sort((a, b) =>
    a.exerciseId.localeCompare(b.exerciseId),
  );
}

export function getExerciseAcademyIntelligenceCoverage(
  canonicalExerciseIds: readonly string[],
): IntelligenceCoverage {
  const uniqueIds = [...new Set(canonicalExerciseIds)].sort((a, b) => a.localeCompare(b));
  const missingExerciseIds = uniqueIds.filter((id) => !INTELLIGENCE_BY_ID.has(id));
  const withIntelligence = uniqueIds.length - missingExerciseIds.length;

  return {
    totalCanonical: uniqueIds.length,
    withIntelligence,
    missingExerciseIds,
    coveragePercent:
      uniqueIds.length === 0 ? 0 : Math.round((withIntelligence / uniqueIds.length) * 100),
  };
}
