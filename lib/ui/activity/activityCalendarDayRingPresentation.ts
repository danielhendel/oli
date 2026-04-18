import { ACTIVITY_STEP_RATING_TIERS, getStepRatingTierIndex } from "@/lib/utils/activityStepRating";

/** Rollup slice used only to derive tier-colored rings (same thresholds as everywhere else). */
export type ActivityRollupEntryLike = { kind: string; steps?: number } | undefined;

/**
 * Single source of truth for Activity weekly strip + full-calendar month rings.
 * Today is never tier-colored (rollup ≠ live Today card); past completed days use tier fill.
 */
export type ActivityDayRingPresentation =
  | { kind: "hidden" }
  | { kind: "tier"; tierIndex: number }
  /** Today: no ring — circle chrome matches Strength weekly strip (header-chrome gray fill). */
  | { kind: "currentDayNoRing" }
  | { kind: "neutralFallback" };

export type ActivityCalendarDayRingModel = {
  presentation: ActivityDayRingPresentation;
  /** Shown after `YYYY-MM-DD, ` in the day cell accessibilityLabel. */
  accessibilityDetail: string;
};

const TIER_COUNT = ACTIVITY_STEP_RATING_TIERS.length;

function rollupEntryForTodayStrip(
  meta: { hasSteps?: boolean; ringTierIndex: number | null } | undefined,
): ActivityRollupEntryLike {
  if (meta?.hasSteps === true) return { kind: "numeric", steps: 1 };
  return undefined;
}

function accessibilityDetailForPresentation(
  presentation: ActivityDayRingPresentation,
  rollupEntryForToday: ActivityRollupEntryLike,
): string {
  switch (presentation.kind) {
    case "hidden":
      return "future day";
    case "currentDayNoRing": {
      const has =
        rollupEntryForToday != null &&
        rollupEntryForToday.kind === "numeric" &&
        (rollupEntryForToday.steps ?? 0) > 0;
      return has ? "today, steps in daily rollup" : "today, current day";
    }
    case "neutralFallback":
      return "no steps in daily rollup";
    case "tier": {
      const label = ACTIVITY_STEP_RATING_TIERS[presentation.tierIndex]!.label;
      return `${label}, steps in daily rollup`;
    }
  }
}

export function resolveActivityCalendarDayRingPresentation(
  params:
    | {
        dayKey: string;
        todayKey: string;
        rollupReady: boolean;
        tierSource: "rollup";
        rollupEntry: ActivityRollupEntryLike;
      }
    | {
        dayKey: string;
        todayKey: string;
        rollupReady: boolean;
        tierSource: "strip";
        completedPastTierIndex: number | null;
      },
): ActivityDayRingPresentation {
  const { dayKey, todayKey } = params;
  const rollupReady = params.tierSource === "rollup" ? params.rollupReady : true;
  if (dayKey > todayKey) return { kind: "hidden" };
  if (dayKey === todayKey) return { kind: "currentDayNoRing" };

  if (params.tierSource === "rollup") {
    if (!rollupReady) return { kind: "neutralFallback" };
    const e = params.rollupEntry;
    const steps = e?.kind === "numeric" ? e.steps : undefined;
    if (steps == null || !(steps > 0)) return { kind: "neutralFallback" };
    return { kind: "tier", tierIndex: getStepRatingTierIndex(Math.round(steps)) };
  }

  const t = params.completedPastTierIndex;
  if (t != null && t >= 0 && t < TIER_COUNT) return { kind: "tier", tierIndex: t };
  return { kind: "neutralFallback" };
}

/** Modal / rollup-backed cells: tier from `rollupEntry` when past + valid numeric steps. */
export function buildActivityCalendarDayModelFromRollup(params: {
  dayKey: string;
  todayKey: string;
  rollupReady: boolean;
  rollupEntry: ActivityRollupEntryLike;
}): ActivityCalendarDayRingModel {
  const presentation = resolveActivityCalendarDayRingPresentation({
    dayKey: params.dayKey,
    todayKey: params.todayKey,
    rollupReady: params.rollupReady,
    tierSource: "rollup",
    rollupEntry: params.rollupEntry,
  });
  return {
    presentation,
    accessibilityDetail: accessibilityDetailForPresentation(
      presentation,
      params.dayKey === params.todayKey ? params.rollupEntry : undefined,
    ),
  };
}

/** Weekly strip: past-day tier from strip meta; today never tier-colored. */
export function buildActivityCalendarDayModelFromStripMeta(params: {
  dayKey: string;
  todayKey: string;
  meta: { hasSteps?: boolean; ringTierIndex: number | null } | undefined;
}): ActivityCalendarDayRingModel {
  const presentation = resolveActivityCalendarDayRingPresentation({
    dayKey: params.dayKey,
    todayKey: params.todayKey,
    rollupReady: true,
    tierSource: "strip",
    completedPastTierIndex: params.dayKey < params.todayKey ? params.meta?.ringTierIndex ?? null : null,
  });
  return {
    presentation,
    accessibilityDetail: accessibilityDetailForPresentation(
      presentation,
      params.dayKey === params.todayKey ? rollupEntryForTodayStrip(params.meta) : undefined,
    ),
  };
}
