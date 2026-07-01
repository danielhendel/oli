import { buildEnrichedExerciseProfile } from "@oli/lib/workouts/exercises/enrichment/buildEnrichedExerciseProfile";
import { getExerciseLibraryEnrichmentById } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";
import type { ExerciseLibraryEnrichmentV1 } from "@oli/lib/workouts/exercises/enrichment/types";
import { getExerciseAcademyIntelligenceById } from "./exerciseAcademyIntelligenceRegistry";
import { getExerciseAcademyEntryById } from "./exerciseAcademyAdapter";
import type { ExerciseAcademyEntry } from "./types";
import type { ExerciseAcademyIntelligenceEntry } from "./exerciseAcademyIntelligenceTypes";
import { listCanonicalWorkoutLibraryExercises } from "../workout-studio/exerciseLibraryAdapter";
import type { EnrichmentReadinessLabel } from "@oli/lib/workouts/exercises/enrichment/types";

export type EnrichedExerciseAcademyProfile = {
  readonly exerciseId: string;
  readonly academyEntry: ExerciseAcademyEntry | null;
  readonly intelligence: ExerciseAcademyIntelligenceEntry | null;
  readonly enrichment: ExerciseLibraryEnrichmentV1 | null;
  readonly mediaRequirementSummary: string;
  readonly coachingDepth: "none" | "basic" | "enriched" | "expert";
  readonly programmingDepth: "none" | "basic" | "enriched" | "expert";
  readonly safetyDepth: "none" | "basic" | "enriched" | "expert";
  readonly readinessLabel: EnrichmentReadinessLabel;
  readonly gaps: readonly string[];
};

function resolveDepth(
  hasBasic: boolean,
  hasEnrichment: boolean,
  isExpertReviewed: boolean,
): "none" | "basic" | "enriched" | "expert" {
  if (isExpertReviewed) return "expert";
  if (hasEnrichment) return "enriched";
  if (hasBasic) return "basic";
  return "none";
}

function buildMediaRequirementSummary(enrichment: ExerciseLibraryEnrichmentV1 | null): string {
  if (!enrichment) {
    return "No enrichment media requirements — keyframe spec not seeded.";
  }

  const poseCount = enrichment.mediaProfile.keyframeRequirements.length;
  const targets = enrichment.mediaProfile.renderTargets.join(", ");
  return `${poseCount} keyframe poses planned · render targets: ${targets} · status: ready-for-expert-review (no approved media)`;
}

/** Wrap Academy entry + intelligence + enrichment for Workout Studio / Media OS. */
export function buildEnrichedExerciseAcademyProfile(
  exerciseId: string,
): EnrichedExerciseAcademyProfile | null {
  const libraryExercises = listCanonicalWorkoutLibraryExercises();
  const academyEntry = getExerciseAcademyEntryById(exerciseId, libraryExercises);
  const intelligence = getExerciseAcademyIntelligenceById(exerciseId);
  const enrichment = getExerciseLibraryEnrichmentById(exerciseId);
  const enrichedProfile = buildEnrichedExerciseProfile(exerciseId);

  if (!academyEntry && !enrichedProfile) {
    return null;
  }

  const isExpertReviewed = enrichment?.reviewStatus === "expert-reviewed";
  const gaps: string[] = [];

  if (!enrichment) {
    gaps.push("Missing exercise library enrichment metadata.");
  } else if (enrichment.reviewStatus === "ready-for-expert-review") {
    gaps.push("Enrichment awaits expert review — not expert-approved.");
  }

  if (!intelligence) {
    gaps.push("Missing Exercise Academy intelligence overlay.");
  }

  gaps.push(...(enrichedProfile?.readinessSummary.knownGaps ?? []));

  const readinessLabel: EnrichmentReadinessLabel = isExpertReviewed
    ? "expert-reviewed"
    : enrichment
      ? "ready-for-expert-review"
      : intelligence
        ? "metadata-ready"
        : "not-started";

  return {
    exerciseId,
    academyEntry,
    intelligence,
    enrichment,
    mediaRequirementSummary: buildMediaRequirementSummary(enrichment),
    coachingDepth: resolveDepth(
      Boolean(academyEntry?.teaching),
      Boolean(enrichment?.coachingProfile),
      isExpertReviewed,
    ),
    programmingDepth: resolveDepth(
      Boolean(academyEntry?.programming),
      Boolean(enrichment?.programmingProfile),
      isExpertReviewed,
    ),
    safetyDepth: resolveDepth(
      Boolean(academyEntry?.safety),
      Boolean(enrichment?.safetyProfile),
      isExpertReviewed,
    ),
    readinessLabel,
    gaps: [...new Set(gaps)],
  };
}
