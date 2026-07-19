import React, { useCallback, useMemo, useState } from "react";
import { useNavigation, useRouter } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import {
  CANONICAL_CALENDAR_MONTHS_BACK,
  buildCanonicalScrollableMonths,
  ScrollableMonthCalendar,
} from "@/lib/ui/calendar/ScrollableMonthCalendar";
import {
  clampMonthYear,
  getTodayDayKeyLocal,
  type MonthYear,
} from "@/lib/ui/calendar/dateUtils";
import { useModuleCalendarYearNavigationHeader } from "@/lib/ui/calendar/useModuleCalendarYearNavigationHeader";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import { replaceSleepDayFromCalendarPick } from "@/lib/ui/recovery/sleepCalendarDayNavigation";

function monthYearFromToday(): MonthYear {
  const d = getTodayDayKeyLocal();
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return clampMonthYear({ year: y, month: m });
}

/**
 * Full-screen month picker for Sleep — same scroll/grid structure as Activity calendar.
 */
export default function SleepCalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const todayMonth = monthYearFromToday();
  const months = useMemo(
    () => buildCanonicalScrollableMonths(todayMonth),
    [todayMonth.year, todayMonth.month],
  );
  const todayMonthIndex = CANONICAL_CALENDAR_MONTHS_BACK;
  const [headerYear, setHeaderYear] = useState(todayMonth.year);

  useModuleCalendarYearNavigationHeader(navigation, headerYear);

  const screenEdges = ["left", "right", "bottom"] as const;

  const onDayPress = useCallback(
    (day: string) => {
      replaceSleepDayFromCalendarPick(router, day);
    },
    [router],
  );

  return (
    <ScreenContainer backgroundColor={UI_APP_SCREEN_BG} padded={false} edges={[...screenEdges]}>
      <ScrollableMonthCalendar
        months={months}
        initialMonthIndex={todayMonthIndex}
        testID="sleep-scrollable-calendar"
        onVisibleRangeChange={(_start, _end, year) => setHeaderYear(year)}
        renderMonth={(item) => (
          <MonthGrid
            monthYear={item.monthYear}
            dayKeyBasis="local"
            ringSemantics="workout"
            markerForDay={() => null}
            onDayPress={onDayPress}
          />
        )}
      />
    </ScreenContainer>
  );
}
