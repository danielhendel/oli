import { useCallback, useMemo, useState } from "react";

import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import {
  buildBodyTodayCardModel,
  type BodyTodayCardModel,
  type BodyTodayOverviewSlice,
} from "@/lib/data/body/bodyTodayCardModel";
import {
  buildBodyWeeklyWeightCardModel,
  type BodyWeeklyWeightCardModel,
} from "@/lib/data/body/bodyWeeklyWeightCardModel";
import {
  buildBodyWeightBaselineDeltaModel,
  type BodyWeightBaselineDeltaModel,
} from "@/lib/data/body/bodyWeightBaselineDeltaModel";
import {
  buildBodyYearlyWeightCardModel,
  type BodyYearlyWeightCardModel,
} from "@/lib/data/body/bodyYearlyWeightCardModel";
import { computeActivityYearNavigationState } from "@/lib/data/activity/activityYearNavigation";
import { computeEnergyWeekNavigationState } from "@/lib/data/dash/energyWeekNavigation";
import { getWeekStartSunday } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseBodyWeightTrendCardsInput = {
  today: DayKey;
  unit: "kg" | "lb";
  samples: readonly BodyWeightSample[];
  overview: BodyTodayOverviewSlice;
};

export type UseBodyWeightTrendCardsResult = {
  todayCardModel: BodyTodayCardModel;
  weekly: {
    model: BodyWeeklyWeightCardModel;
    weekRangeLabel: string;
    canGoPrevious: boolean;
    canGoNext: boolean;
    onPressPrevious: () => void;
    onPressNext: () => void;
  };
  baselineModel: BodyWeightBaselineDeltaModel;
  yearly: {
    model: BodyYearlyWeightCardModel;
    /** Mount the card only once the current year has at least one reading. */
    visible: boolean;
    canGoPrevious: boolean;
    canGoNext: boolean;
    onPressPrevious: () => void;
    onPressNext: () => void;
  };
};

/**
 * Thin wiring hook for the Body weight trend cards. Owns week/year navigation state and memoizes
 * the pure card models so the screen stays presentation-only (no heavy trend math in the screen).
 * Reuses {@link computeEnergyWeekNavigationState} and {@link computeActivityYearNavigationState}
 * for bounded navigation instead of introducing competing nav logic.
 */
export function useBodyWeightTrendCards(
  input: UseBodyWeightTrendCardsInput,
): UseBodyWeightTrendCardsResult {
  const { today, unit, samples, overview } = input;

  const [weekAnchorDay, setWeekAnchorDay] = useState<DayKey>(() => getWeekStartSunday(today));
  const weekNav = useMemo(
    () => computeEnergyWeekNavigationState({ todayDayKey: today, weekAnchorDay }),
    [today, weekAnchorDay],
  );
  const onPressPreviousWeek = useCallback(() => {
    setWeekAnchorDay(weekNav.previousWeekAnchor);
  }, [weekNav.previousWeekAnchor]);
  const onPressNextWeek = useCallback(() => {
    if (weekNav.nextWeekAnchor != null) setWeekAnchorDay(weekNav.nextWeekAnchor);
  }, [weekNav.nextWeekAnchor]);

  const currentYear = useMemo(() => Number.parseInt(today.slice(0, 4), 10), [today]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const yearNav = useMemo(
    () => computeActivityYearNavigationState({ todayDayKey: today, selectedYear }),
    [today, selectedYear],
  );
  const onPressPreviousYear = useCallback(() => {
    setSelectedYear(yearNav.previousYear);
  }, [yearNav.previousYear]);
  const onPressNextYear = useCallback(() => {
    if (yearNav.nextYear != null) setSelectedYear(yearNav.nextYear);
  }, [yearNav.nextYear]);

  const todayCardModel = useMemo(
    () => buildBodyTodayCardModel({ overview, unit }),
    [overview, unit],
  );

  const weeklyModel = useMemo(
    () =>
      buildBodyWeeklyWeightCardModel({
        todayDayKey: today,
        weekDayKeys: weekNav.weekDayKeys,
        samples,
        unit,
      }),
    [today, weekNav.weekDayKeys, samples, unit],
  );

  const baselineModel = useMemo(
    () => buildBodyWeightBaselineDeltaModel({ todayDayKey: today, samples, unit }),
    [today, samples, unit],
  );

  const yearlyModel = useMemo(
    () =>
      buildBodyYearlyWeightCardModel({
        selectedYear: yearNav.year,
        todayDayKey: today,
        samples,
        unit,
      }),
    [yearNav.year, today, samples, unit],
  );

  const currentYearModel = useMemo(
    () =>
      yearNav.year === currentYear
        ? yearlyModel
        : buildBodyYearlyWeightCardModel({
            selectedYear: currentYear,
            todayDayKey: today,
            samples,
            unit,
          }),
    [yearlyModel, yearNav.year, currentYear, today, samples, unit],
  );

  return {
    todayCardModel,
    weekly: {
      model: weeklyModel,
      weekRangeLabel: weekNav.weekRangeLabel,
      canGoPrevious: weekNav.canGoPrevious,
      canGoNext: weekNav.canGoNext,
      onPressPrevious: onPressPreviousWeek,
      onPressNext: onPressNextWeek,
    },
    baselineModel,
    yearly: {
      model: yearlyModel,
      visible: currentYearModel.hasData,
      canGoPrevious: yearNav.canGoPrevious,
      canGoNext: yearNav.canGoNext,
      onPressPrevious: onPressPreviousYear,
      onPressNext: onPressNextYear,
    },
  };
}
