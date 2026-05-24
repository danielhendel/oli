import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { parseActivityDailyDetailsNumericSteps } from "@/lib/data/activity/activityOverviewCardModel";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

/**
 * Phase 2B — Display-only NEAT/Strength/Cardio buckets attached to the Today card model
 * when {@link DailyFactsDto.activity.stepsAllocation} is present and its partition matches
 * the headline integer. Strictly additive: omitted entirely when allocation is missing.
 */
export type ActivityTodayOverviewStepsAllocation = {
  neatSteps: number;
  strengthSteps: number;
  cardioSteps: number;
};

export type ActivityTodayOverviewCardModel = {
  stepsDigits: string | null;
  tierPill: ReturnType<typeof getStepRatingActivityDescriptorPill>;
  subtitle: string | null;
  compactStatsSummaryForA11y: string;
  /** Tier-colored progress bar (today’s step volume). */
  activityTierIndexForBar: number;
  fillWidth01Override: number;
  /**
   * Phase 2B — attached only when the input allocation's buckets exactly partition the
   * Today headline integer (`neat + strength + cardio === Math.round(headlineSteps)`).
   * On any mismatch the field is omitted entirely (UI fail-closed — never invent rows).
   */
  stepsAllocation?: ActivityTodayOverviewStepsAllocation;
};

const isFiniteNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  Number.isInteger(value);

/**
 * Presentation model for Activity Today card — derives tier pill + subtitle from merged Today rollup/baseline delta.
 *
 * @param allocation Phase 2B — optional DailyFacts allocation buckets. Attached to the
 * returned model only when the buckets exactly partition the Today headline integer.
 */
export function buildActivityTodayOverviewCardModel(
  dailyDetailsModel: ActivityDailyDetailsCardModel | null,
  allocation?: ActivityTodayOverviewStepsAllocation | undefined,
): ActivityTodayOverviewCardModel | null {
  if (dailyDetailsModel == null) return null;

  const steps = parseActivityDailyDetailsNumericSteps(dailyDetailsModel.compactStatsSummary);
  const stepsForBar = steps ?? 0;
  const tierPill = getStepRatingActivityDescriptorPill(stepsForBar);
  const tierIdx = getStepRatingTierIndex(Math.round(stepsForBar));
  const fill01 = activityStepsDisplayScaleFill01(stepsForBar);
  const digits =
    steps != null
      ? Math.round(steps).toLocaleString()
      : (dailyDetailsModel.compactStatsSummary.match(/^([\d,]+)/)?.[1] ?? null);

  const subtitle =
    dailyDetailsModel.deltaFromBaselineLabel != null && dailyDetailsModel.deltaFromBaselineLabel.length > 0
      ? dailyDetailsModel.deltaFromBaselineLabel
      : steps != null
        ? "Steps recorded today"
        : null;

  const stepsAllocation = resolveAllocationForModel(steps, allocation);

  return {
    stepsDigits: digits,
    tierPill,
    subtitle,
    compactStatsSummaryForA11y: dailyDetailsModel.compactStatsSummary,
    activityTierIndexForBar: tierIdx,
    fillWidth01Override: fill01,
    ...(stepsAllocation != null ? { stepsAllocation } : {}),
  };
}

/**
 * Phase 2B — strict partition guard. Returns the allocation buckets only when every bucket
 * is a non-negative integer and their sum equals the normalized headline integer. Any
 * deviation (missing headline, non-integer buckets, partition mismatch) → omit, never invent.
 */
function resolveAllocationForModel(
  headlineSteps: number | null,
  allocation: ActivityTodayOverviewStepsAllocation | undefined,
): ActivityTodayOverviewStepsAllocation | undefined {
  if (allocation == null) return undefined;
  if (headlineSteps == null || !Number.isFinite(headlineSteps)) return undefined;
  const normalizedHeadline = Math.round(headlineSteps);
  if (!isFiniteNonNegativeInteger(normalizedHeadline)) return undefined;
  // Phase 2B UX policy: when the headline integer is 0 there is nothing to allocate,
  // and rendering three "0 steps" rows reads like broken data even though the backend
  // partition (0 = 0 + 0 + 0) is deterministically valid. Hide the block in that case.
  // Backend allocation generation, schema, and authority behavior are intentionally unchanged.
  if (normalizedHeadline === 0) return undefined;
  if (
    !isFiniteNonNegativeInteger(allocation.neatSteps) ||
    !isFiniteNonNegativeInteger(allocation.strengthSteps) ||
    !isFiniteNonNegativeInteger(allocation.cardioSteps)
  ) {
    return undefined;
  }
  if (
    allocation.neatSteps + allocation.strengthSteps + allocation.cardioSteps !==
    normalizedHeadline
  ) {
    return undefined;
  }
  return {
    neatSteps: allocation.neatSteps,
    strengthSteps: allocation.strengthSteps,
    cardioSteps: allocation.cardioSteps,
  };
}
