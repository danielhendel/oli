import { BENCH_PRESS_PILOT_EXERCISE_ID } from "../data/benchPressMasterMediaPackage";

export const BENCH_PRESS_PRODUCT_EXERCISE_ID = BENCH_PRESS_PILOT_EXERCISE_ID;

export const BENCH_PRESS_PRODUCT_VERSION = "bench-press-product-v1" as const;
export const BENCH_PRESS_STORYBOARD_VERSION = "storyboard-v1" as const;
export const BENCH_PRESS_BRIEF_VERSION = "brief-v1" as const;
export const BENCH_PRESS_QA_VERSION = "qa-v1" as const;

export const BENCH_PRESS_PRODUCT_CREATED_FOR =
  "Oli Master Exercise Product — Bench Press reference standard" as const;

export const BENCH_PRESS_ASSET_STATUS = "placeholder-only" as const;

export function isBenchPressProductExercise(exerciseId: string | null | undefined): boolean {
  return exerciseId === BENCH_PRESS_PRODUCT_EXERCISE_ID;
}
