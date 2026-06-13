// lib/data/program/searchProgramExerciseOptions.ts
/**
 * Search/filter for the Program Builder "Select exercise" page. Pure — no IO, no React.
 *
 * Operates on the already muscle-group-filtered options, so muscle filtering stays active while the
 * user searches. Matching is a strict, deterministic token filter across the option's truthful
 * library fields (name, primary/secondary muscles, equipment, movement, logging type) — every query
 * token must appear in the option's searchable text, so an unmatched query yields an empty result
 * (drives the "No matching exercises" state).
 *
 * NOTE on reuse: the library's {@link searchExercises} is a ranked *retrieval* utility tuned for
 * "find the exercise the user means" — it always returns up to `limit` best-ranked rows and never
 * empties, so it can't express a field FILTER with an empty state. We mirror its normalization here
 * (lowercase, underscores→spaces, strip punctuation) rather than fork its scoring.
 */
import type { ProgramExerciseDetails } from "@/lib/data/program/getProgramExerciseDetails";
import type { ProgramExerciseOption } from "@/lib/data/program/programExerciseRecommendationTypes";

export type SearchProgramExerciseOptionsArgs = {
  options: ProgramExerciseOption[];
  /** Resolves truthful library detail fields for an exercise id. */
  getDetails: (exerciseId: string) => ProgramExerciseDetails;
  query: string;
};

/** Normalize: lowercase, underscores→space, strip non [a-z0-9 ], collapse spaces (mirrors search.ts). */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The normalized searchable haystack for an option, from its truthful library fields. */
function optionHaystack(
  option: ProgramExerciseOption,
  details: ProgramExerciseDetails,
): string {
  const parts = [
    option.name,
    option.exerciseId,
    ...details.primaryMuscles,
    ...details.secondaryMuscles,
    details.equipment ?? "",
    details.movement ?? "",
    details.loggingType,
  ];
  return normalize(parts.join(" "));
}

/**
 * Filter ranked options by `query` across truthful fields. A blank query returns the options
 * unchanged. The returned order follows the incoming option order (engine ranking is preserved).
 */
export function searchProgramExerciseOptions(
  args: SearchProgramExerciseOptionsArgs,
): ProgramExerciseOption[] {
  const { options, getDetails, query } = args;
  const normalizedQuery = normalize(query);
  if (normalizedQuery === "") return options;

  const queryTokens = normalizedQuery.split(" ").filter((token) => token.length > 0);
  return options.filter((option) => {
    const haystack = optionHaystack(option, getDetails(option.exerciseId));
    return queryTokens.every((token) => haystack.includes(token));
  });
}
