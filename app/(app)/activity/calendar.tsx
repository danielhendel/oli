import React, { useCallback, useMemo, useState } from "react";
import { useNavigation, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import {
  clampMonthYear,
  getTodayDayKeyLocal,
  type MonthYear,
} from "@/lib/ui/calendar/dateUtils";
import {
  CANONICAL_CALENDAR_MONTHS_BACK,
  buildCanonicalScrollableMonths,
  ScrollableMonthCalendar,
} from "@/lib/ui/calendar/ScrollableMonthCalendar";
import { useModuleCalendarYearNavigationHeader } from "@/lib/ui/calendar/useModuleCalendarYearNavigationHeader";
import { computeActivityCalendarFetchDayKeys } from "@/lib/data/activity/activityOverviewRanges";
import { useActivityStepsRollupForKeys } from "@/lib/data/activity/useActivityStepsRollupMap";
import { buildActivityCalendarDayModelFromRollup } from "@/lib/ui/activity/activityCalendarDayRingPresentation";
import type { DayKey } from "@/lib/ui/calendar/types";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

function monthYearFromToday(): MonthYear {
  const d = getTodayDayKeyLocal();
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return clampMonthYear({ year: y, month: m });
}

export default function ActivityCalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const todayMonth = monthYearFromToday();
  const months = useMemo(
    () => buildCanonicalScrollableMonths(todayMonth),
    [todayMonth.year, todayMonth.month],
  );
  const todayMonthIndex = CANONICAL_CALENDAR_MONTHS_BACK;
  const [headerYear, setHeaderYear] = useState(todayMonth.year);

  const todayDayKey = getTodayDayKeyLocal();
  const fetchKeys = useMemo(() => computeActivityCalendarFetchDayKeys(todayDayKey), [todayDayKey]);
  const rollup = useActivityStepsRollupForKeys(fetchKeys);

  const activityCalendarDayForDay = useCallback(
    (day: DayKey) => {
      const rollupEntry = rollup.rollupDisplayByDay[day];
      return buildActivityCalendarDayModelFromRollup({
        dayKey: day,
        todayKey: todayDayKey,
        rollupReady: rollupEntry !== undefined,
        rollupEntry,
      });
    },
    [rollup, todayDayKey],
  );

  useModuleCalendarYearNavigationHeader(navigation, headerYear);

  const screenEdges = ["left", "right", "bottom"] as const;

  return (
    <ScreenContainer backgroundColor={UI_APP_SCREEN_BG} padded={false} edges={[...screenEdges]}>
      <ScrollableMonthCalendar
        months={months}
        initialMonthIndex={todayMonthIndex}
        testID="activity-scrollable-calendar"
        onVisibleRangeChange={(_start, _end, year) => setHeaderYear(year)}
        renderMonth={(item) => (
          <MonthGrid
            monthYear={item.monthYear}
            dayKeyBasis="local"
            ringSemantics="activity"
            markerForDay={() => null}
            activityCalendarDayForDay={activityCalendarDayForDay}
            onDayPress={(day) => router.push(`/(app)/activity/day/${day}`)}
          />
        )}
      />
    </ScreenContainer>
  );
}
