import { buildBenchPressCandidateReviewState } from "./buildBenchPressCandidateReviewState";
import { buildCandidateReviewState } from "./buildCandidateReviewState";
import { isBenchPressProductExercise } from "../bench-press-product/benchPressProductConstants";
import type { CandidateReviewState } from "./types";

/** Pure helper — resolves candidate review state for an exercise without React. */
export function resolveCandidateReviewStateForExercise(
  exerciseId: string,
): CandidateReviewState | null {
  if (!isBenchPressProductExercise(exerciseId)) {
    return buildCandidateReviewState({
      exerciseId,
      candidates: [],
    });
  }
  return buildBenchPressCandidateReviewState();
}
