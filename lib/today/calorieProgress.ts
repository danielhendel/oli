import type { TodayTargetStatus } from "@/lib/today/types";

/** Material overage threshold (10% above target) before marking overTarget. */
const OVER_TARGET_RATIO = 1.1;

export type CalorieProgressResult = {
  progress: number;
  status: TodayTargetStatus;
};

/**
 * Conservative calorie intake adherence — do not reward over-eating.
 * - under target: current / target
 * - at/within target: complete
 * - materially over: overTarget, progress capped at 1
 */
export function computeCalorieIntakeProgress(
  consumed: number | null | undefined,
  target: number | null | undefined,
): CalorieProgressResult {
  if (target == null || !(target > 0)) {
    return { progress: 0, status: "missing" };
  }
  if (consumed == null || !Number.isFinite(consumed) || consumed < 0) {
    return { progress: 0, status: "notStarted" };
  }
  if (consumed >= target * OVER_TARGET_RATIO) {
    return { progress: 1, status: "overTarget" };
  }
  if (consumed >= target) {
    return { progress: 1, status: "complete" };
  }
  const ratio = consumed / target;
  return {
    progress: Math.min(1, Math.max(0, ratio)),
    status: ratio > 0 ? "inProgress" : "notStarted",
  };
}
