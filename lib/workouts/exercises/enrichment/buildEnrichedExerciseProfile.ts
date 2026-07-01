import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseLibraryEnrichmentById } from "./libraryEnrichment.v1";
import type { EnrichedExerciseProfile, EnrichmentReadinessLabel, ExerciseLibraryEnrichmentV1 } from "./types";

function resolveReadinessLabel(enrichment: ExerciseLibraryEnrichmentV1 | null): EnrichmentReadinessLabel {
  if (!enrichment) return "not-started";
  switch (enrichment.reviewStatus) {
    case "expert-reviewed":
      return "expert-reviewed";
    case "ready-for-expert-review":
      return "ready-for-expert-review";
    case "draft":
      return "partial";
    case "deprecated":
      return "not-started";
    default:
      return "metadata-ready";
  }
}

/** Merge canonical library row with optional enrichment. Canonical identity wins. */
export function buildEnrichedExerciseProfile(exerciseId: string): EnrichedExerciseProfile | null {
  const canonical = EXERCISE_LIBRARY_V1.find((row) => row.exerciseId === exerciseId);
  if (!canonical) {
    return null;
  }

  const enrichment = getExerciseLibraryEnrichmentById(exerciseId);
  const readinessLabel = resolveReadinessLabel(enrichment);

  return {
    exerciseId: canonical.exerciseId,
    name: canonical.name,
    aliases: canonical.aliases,
    equipment: canonical.equipment,
    primaryMuscles: canonical.primaryCoarse,
    secondaryMuscles: canonical.secondaryCoarse,
    movementPattern: canonical.movement,
    trainingType: canonical.trainingType,
    hasEnrichment: enrichment !== null,
    enrichment,
    readinessSummary: {
      label: readinessLabel,
      expertReviewRequired: enrichment?.qualityProfile.expertReviewRequired ?? true,
      mediaPlanningReady:
        enrichment !== null &&
        enrichment.mediaProfile.keyframeRequirements.length >= 3 &&
        enrichment.mediaProfile.renderTargets.includes("16:9"),
      knownGaps: enrichment?.qualityProfile.knownGaps ?? ["No enrichment metadata exists for this exercise."],
    },
  };
}
