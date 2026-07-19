import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ScreenContainer, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import {
  CANONICAL_CALENDAR_MONTHS_BACK,
  buildCanonicalScrollableMonths,
  ScrollableMonthCalendar,
} from "@/lib/ui/calendar/ScrollableMonthCalendar";
import { useModuleCalendarYearNavigationHeader } from "@/lib/ui/calendar/useModuleCalendarYearNavigationHeader";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  clearWorkoutCalendarMarkerCache,
  loadWorkoutCalendarMarkerSnapshot,
  persistWorkoutCalendarMarkerSnapshot,
} from "@/lib/data/workouts/workoutsCalendarMarkerCache";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import { getWorkoutTruthTargetConfig } from "@/lib/debug/workoutTruthTargets";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import {
  getMonthFirstDay,
  getMonthLastDay,
  getTodayDayKeyLocal,
  type MonthYear,
  clampMonthYear,
} from "@/lib/ui/calendar/dateUtils";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import { deriveSessionTypeFlags, reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { WorkoutProductDomain } from "@/lib/data/workouts/workoutDomain";
import { narrowWorkoutMarkerFlagsForDomain } from "@/lib/data/workouts/workoutDomain";

function monthYearFromToday(): MonthYear {
  const d = getTodayDayKeyLocal();
  return clampMonthYear({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) });
}

const FETCH_WINDOW_MARGIN_MONTHS = 1;

export function WorkoutsCalendarRoute({ domain }: { domain: WorkoutProductDomain }) {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const todayMonth = monthYearFromToday();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [windowBounds, setWindowBounds] = useState(() => ({
    startIndex: CANONICAL_CALENDAR_MONTHS_BACK,
    endIndex: CANONICAL_CALENDAR_MONTHS_BACK,
  }));
  const [markerMap, setMarkerMap] = useState<Map<DayKey, WorkoutMarkerFlags>>(new Map());
  const [headerYear, setHeaderYear] = useState(todayMonth.year);
  const months = useMemo(
    () => buildCanonicalScrollableMonths(todayMonth),
    [todayMonth.year, todayMonth.month],
  );
  const todayMonthIndex = CANONICAL_CALENDAR_MONTHS_BACK;

  useModuleCalendarYearNavigationHeader(navigation, headerYear);

  const clampedStart = Math.max(0, Math.min(windowBounds.startIndex, months.length - 1));
  const clampedEnd = Math.max(clampedStart, Math.min(windowBounds.endIndex, months.length - 1));
  const startDay = getMonthFirstDay(months[clampedStart]!.monthYear);
  const endDay = getMonthLastDay(months[clampedEnd]!.monthYear);
  const range = useWorkoutsCalendarRange(startDay, endDay, {
    refreshEpoch,
    rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
    debugHydrateLabel: "calendar-viewport",
    preferWorkoutDaySummaries: true,
  });

  const rangeReady = range.status === "ready";
  const rangeDays = rangeReady ? range.days : null;
  const summaryMarkerFlags = rangeReady ? (range.markerFlagsByDay ?? null) : null;

  const kindsSig = useMemo(
    () => `${DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS.join(",")}|domain:${domain}`,
    [domain],
  );

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;
    void loadWorkoutCalendarMarkerSnapshot(uid, kindsSig, domain).then((fromDisk) => {
      if (cancelled || !fromDisk) return;
      setMarkerMap((prev) => (prev.size > 0 ? prev : fromDisk));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, kindsSig, domain]);

  useEffect(() => {
    if (!rangeReady || !rangeDays) return;
    const mergeFlags = (
      prev: Map<DayKey, WorkoutMarkerFlags>,
      next: Map<DayKey, WorkoutMarkerFlags>,
    ): Map<DayKey, WorkoutMarkerFlags> => {
      if (next.size === prev.size) {
        let same = true;
        for (const [k, v] of next) {
          const prevFlags = prev.get(k);
          if (
            !prevFlags ||
            prevFlags.hasStrength !== v.hasStrength ||
            prevFlags.hasCardio !== v.hasCardio
          ) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return next;
    };

    if (summaryMarkerFlags) {
      setMarkerMap((prev) => {
        const next = new Map(prev);
        for (const d of rangeDays) {
          const f = summaryMarkerFlags[d.day];
          if (f && (f.hasStrength || f.hasCardio)) {
            const narrowed = narrowWorkoutMarkerFlagsForDomain(
              { hasStrength: f.hasStrength, hasCardio: f.hasCardio },
              domain,
            );
            if (narrowed) next.set(d.day, narrowed);
            else next.delete(d.day);
          } else {
            next.delete(d.day);
          }
        }
        return mergeFlags(prev, next);
      });
      return;
    }

    setMarkerMap((prev) => {
      const next = new Map(prev);
      for (const d of rangeDays) {
        if (d.workouts.length > 0) {
          const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
          const flags = deriveSessionTypeFlags(sessions);
          const narrowed = narrowWorkoutMarkerFlagsForDomain(flags, domain);
          if (narrowed) next.set(d.day, narrowed);
          else next.delete(d.day);
        } else next.delete(d.day);
      }
      return mergeFlags(prev, next);
    });
  }, [rangeReady, rangeDays, summaryMarkerFlags, domain]);

  const onVisibleRangeChange = useCallback(
    (min: number, max: number, year: number) => {
      const nextStart = Math.max(0, min - FETCH_WINDOW_MARGIN_MONTHS);
      const nextEnd = Math.min(months.length - 1, max + FETCH_WINDOW_MARGIN_MONTHS);
      setWindowBounds((prev) =>
        prev.startIndex === nextStart && prev.endIndex === nextEnd
          ? prev
          : { startIndex: nextStart, endIndex: nextEnd },
      );
      setHeaderYear(year);
    },
    [months],
  );

  useEffect(() => {
    if (!(__DEV__ && !process.env.JEST_WORKER_ID)) return;
    const markedDays = [...markerMap.keys()].sort();
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] calendar-source", {
      productDomain: domain,
      rangeStart: startDay,
      rangeEnd: endDay,
      rawEventKinds: [...DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS],
      markedDayCount: markedDays.length,
      markedDays,
    });
  }, [markerMap, startDay, endDay, domain]);

  useEffect(() => {
    if (!(__DEV__ && !process.env.JEST_WORKER_ID)) return;
    if (!getWorkoutTruthTargetConfig()) return;
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] calendar-viewport-vs-2025-history", {
      fetchStartDay: startDay,
      fetchEndDay: endDay,
      october2025CouldLoadWithoutScroll: startDay <= "2025-10-31" && endDay >= "2025-10-01",
      november2025CouldLoadWithoutScroll: startDay <= "2025-11-30" && endDay >= "2025-11-01",
      note: "Initial window is often a single month; scroll expands fetch — see windowBounds.",
    });
  }, [startDay, endDay]);

  if (range.status === "error" && markerMap.size === 0) {
    return (
      <ScreenContainer>
        <ErrorState
          message={range.error}
          requestId={range.requestId}
          onRetry={() => {
            setRefreshEpoch((n) => n + 1);
          }}
        />
      </ScreenContainer>
    );
  }

  const hasAnyWorkouts = markerMap.size > 0;
  /** Avoid “no workouts” footer while the first fetch or a refresh is still in flight. */
  const rangeSettledForEmpty =
    range.status === "ready" && !range.refreshing;
  const showEmptyFooter = rangeSettledForEmpty && !hasAnyWorkouts;

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    const uid = user?.uid;
    if (!uid) return;
    if (showEmptyFooter) {
      void clearWorkoutCalendarMarkerCache(domain);
      return;
    }
    if (markerMap.size === 0) return;
    const t = setTimeout(() => {
      void persistWorkoutCalendarMarkerSnapshot(uid, kindsSig, markerMap, domain);
    }, 200);
    return () => clearTimeout(t);
  }, [showEmptyFooter, markerMap, user?.uid, kindsSig, domain]);

  const markerForDay = (day: DayKey): WorkoutMarkerFlags | null => {
    return markerMap.get(day) ?? null;
  };

  const onDayPress = (day: DayKey) => {
    router.push({
      pathname: domain === "strength" ? "/(app)/workouts/day/[day]" : "/(app)/cardio/day/[day]",
      params: { day },
    });
  };

  /** Stack header below status bar; avoid top safe-area + padded container duplicating inset under nav (matches Body calendar / workouts day). */
  const screenEdges = ["left", "right", "bottom"] as const;

  return (
    <ScreenContainer backgroundColor={UI_APP_SCREEN_BG} padded={false} edges={[...screenEdges]}>
      <ScrollableMonthCalendar
        months={months}
        initialMonthIndex={todayMonthIndex}
        testID="workouts-scrollable-calendar"
        onVisibleRangeChange={onVisibleRangeChange}
        renderMonth={(item) => (
          <MonthGrid
            monthYear={item.monthYear}
            markerForDay={markerForDay}
            onDayPress={onDayPress}
          />
        )}
        ListFooterComponent={
          showEmptyFooter ? (
            <View style={styles.emptyWrapper}>
              <EmptyState
                title={domain === "strength" ? "No strength workouts in this range" : "No cardio sessions in this range"}
                description="When sessions are imported from Apple Health or logged for these dates, they will appear here."
              />
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

export default function WorkoutsStrengthCalendarScreen() {
  return <WorkoutsCalendarRoute domain="strength" />;
}

const styles = StyleSheet.create({
  emptyWrapper: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
});

