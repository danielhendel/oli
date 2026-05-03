import {
  type ActivityDailyDetailsCardModel,
  parseActivityDailyDetailsNumericSteps,
} from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";

/**
 * Deterministic copy for Today vs 90-day baseline mean (numeric inputs only).
 * Callers must supply rounded step totals from existing card models / rollups.
 */
export function computeActivityTodayDeltaFromBaseline(
  todaySteps: number,
  baselineSteps: number,
): { deltaFromBaselineSteps: number; deltaFromBaselineLabel: string } {
  const delta = Math.round(todaySteps) - Math.round(baselineSteps);
  if (Math.abs(delta) < 250) {
    return {
      deltaFromBaselineSteps: delta,
      deltaFromBaselineLabel: "You are on track with your baseline",
    };
  }
  if (delta < 0) {
    return {
      deltaFromBaselineSteps: delta,
      deltaFromBaselineLabel: `${Math.abs(delta).toLocaleString()} steps below your baseline`,
    };
  }
  return {
    deltaFromBaselineSteps: delta,
    deltaFromBaselineLabel: `${delta.toLocaleString()} steps above your baseline`,
  };
}

/**
 * Enriches the Today card model with baseline delta when both {@link parseActivityDailyDetailsNumericSteps}
 * parses succeed; otherwise returns `todayModel` unchanged (no new data sources).
 */
export function mergeTodayDetailsWithBaselineDelta(
  todayModel: ActivityDailyDetailsCardModel | null,
  baselineModel: ActivityDailyDetailsCardModel | null,
): ActivityDailyDetailsCardModel | null {
  if (todayModel == null) return null;

  const todaySteps = parseActivityDailyDetailsNumericSteps(todayModel.compactStatsSummary);
  const baselineSummary = baselineModel?.compactStatsSummary?.trim();
  const baselineSteps =
    baselineModel != null &&
    baselineSummary != null &&
    baselineSummary !== ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA
      ? parseActivityDailyDetailsNumericSteps(baselineModel.compactStatsSummary)
      : null;

  if (todaySteps == null || baselineSteps == null) {
    return todayModel;
  }

  const { deltaFromBaselineSteps, deltaFromBaselineLabel } = computeActivityTodayDeltaFromBaseline(
    todaySteps,
    baselineSteps,
  );
  return {
    ...todayModel,
    deltaFromBaselineSteps,
    deltaFromBaselineLabel,
  };
}

/**
 * Signed steps delta vs a baseline mean (e.g. 90-day activity baseline), for compact row UI.
 * Returns `null` when baseline is unknown (omitted in UI).
 */
export function formatSignedBaselineDelta(
  daySteps: number,
  baselineMeanSteps: number | null,
): string | null {
  if (baselineMeanSteps == null || !Number.isFinite(baselineMeanSteps)) return null;
  const d = Math.round(daySteps) - Math.round(baselineMeanSteps);
  const abs = Math.abs(d).toLocaleString();
  if (d > 0) return `+${abs}`;
  if (d < 0) return `-${abs}`;
  return "0";
}
