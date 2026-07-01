import type { ExerciseMediaCandidate } from "../../candidate-review/types";

export const BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES_VERSION =
  "bench-press-keyframe-image-candidates-v1" as const;

/**
 * Live Bench Press keyframe image candidates.
 *
 * Repo truth (Sprint M11): no keyframe image files exist under
 * apps/professional/public/media/exercises/bench_press/keyframes/
 *
 * Do not fabricate approved-master candidates. Test fixtures prove the
 * approved-master path in image-pack/fixtures/.
 */
export const BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES: readonly ExerciseMediaCandidate[] = [];

export function listBenchPressKeyframeImageCandidates(): readonly ExerciseMediaCandidate[] {
  return BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES;
}
