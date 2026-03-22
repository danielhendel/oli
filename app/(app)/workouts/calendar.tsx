import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, FlatList, type ViewToken } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ScreenContainer, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
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
import { getMonthFirstDay, getMonthLastDay, type MonthYear, clampMonthYear } from "@/lib/ui/calendar/dateUtils";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import { deriveSessionTypeFlags, reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";

function monthYearFromToday(): MonthYear {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftMonth(monthYear: MonthYear, delta: number): MonthYear {
  return clampMonthYear({ year: monthYear.year, month: monthYear.month + delta });
}

type CalendarMonthModel = {
  key: string;
  monthYear: MonthYear;
};

const MONTHS_BACK = 12;
const MONTHS_FORWARD = 12;
const FETCH_WINDOW_MARGIN_MONTHS = 1;
const CALENDAR_MONTH_ITEM_HEIGHT = 372;

function buildMonthRange(center: MonthYear): CalendarMonthModel[] {
  const out: CalendarMonthModel[] = [];
  for (let i = -MONTHS_BACK; i <= MONTHS_FORWARD; i += 1) {
    const m = shiftMonth(center, i);
    out.push({
      key: `${m.year}-${String(m.month).padStart(2, "0")}`,
      monthYear: m,
    });
  }
  return out;
}

export default function WorkoutsCalendarScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const todayMonth = monthYearFromToday();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [windowBounds, setWindowBounds] = useState(() => ({
    startIndex: MONTHS_BACK,
    endIndex: MONTHS_BACK,
  }));
  const [markerMap, setMarkerMap] = useState<Map<DayKey, WorkoutMarkerFlags>>(new Map());
  const months = useMemo(() => buildMonthRange(todayMonth), [todayMonth.year, todayMonth.month]);
  const todayMonthIndex = MONTHS_BACK;
  const flatListRef = useRef<FlatList<CalendarMonthModel>>(null);

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
    () => DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS.join(","),
    [],
  );

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;
    void loadWorkoutCalendarMarkerSnapshot(uid, kindsSig).then((fromDisk) => {
      if (cancelled || !fromDisk) return;
      setMarkerMap((prev) => (prev.size > 0 ? prev : fromDisk));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, kindsSig]);

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
            next.set(d.day, { hasStrength: f.hasStrength, hasCardio: f.hasCardio });
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
          next.set(d.day, deriveSessionTypeFlags(sessions));
        } else next.delete(d.day);
      }
      return mergeFlags(prev, next);
    });
  }, [rangeReady, rangeDays, summaryMarkerFlags]);

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    const id = requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: todayMonthIndex,
        animated: false,
        viewPosition: 0,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [todayMonthIndex]);

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const token of viewableItems) {
        if (typeof token.index !== "number") continue;
        if (token.index < min) min = token.index;
        if (token.index > max) max = token.index;
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return;
      const nextStart = Math.max(0, min - FETCH_WINDOW_MARGIN_MONTHS);
      const nextEnd = Math.min(months.length - 1, max + FETCH_WINDOW_MARGIN_MONTHS);
      setWindowBounds((prev) =>
        prev.startIndex === nextStart && prev.endIndex === nextEnd
          ? prev
          : { startIndex: nextStart, endIndex: nextEnd },
      );
    },
    [months.length],
  );
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
  }).current;

  useEffect(() => {
    if (!(__DEV__ && !process.env.JEST_WORKER_ID)) return;
    const markedDays = [...markerMap.keys()].sort();
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] calendar-source", {
      rangeStart: startDay,
      rangeEnd: endDay,
      rawEventKinds: [...DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS],
      markedDayCount: markedDays.length,
      markedDays,
    });
  }, [markerMap, startDay, endDay]);

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
      void clearWorkoutCalendarMarkerCache();
      return;
    }
    if (markerMap.size === 0) return;
    const t = setTimeout(() => {
      void persistWorkoutCalendarMarkerSnapshot(uid, kindsSig, markerMap);
    }, 200);
    return () => clearTimeout(t);
  }, [showEmptyFooter, markerMap, user?.uid, kindsSig]);

  const markerForDay = (day: DayKey): WorkoutMarkerFlags | null => {
    return markerMap.get(day) ?? null;
  };

  const onDayPress = (day: DayKey) => {
    router.push({
      pathname: "/(app)/workouts/day/[day]",
      params: { day },
    });
  };

  return (
    <ScreenContainer>
      <FlatList
        ref={flatListRef}
        data={months}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.scroll}
        initialScrollIndex={todayMonthIndex}
        initialNumToRender={5}
        maxToRenderPerBatch={6}
        windowSize={7}
        getItemLayout={(_, index) => ({
          length: CALENDAR_MONTH_ITEM_HEIGHT,
          offset: CALENDAR_MONTH_ITEM_HEIGHT * index,
          index,
        })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={() => {
          flatListRef.current?.scrollToOffset({
            offset: todayMonthIndex * CALENDAR_MONTH_ITEM_HEIGHT,
            animated: false,
          });
        }}
        ListHeaderComponent={<View style={styles.topSpacer} />}
        renderItem={({ item }) => (
          <View style={styles.monthItem}>
            <MonthGrid monthYear={item.monthYear} markerForDay={markerForDay} onDayPress={onDayPress} />
          </View>
        )}
        ListFooterComponent={
          showEmptyFooter ? (
            <View style={styles.emptyWrapper}>
              <EmptyState
                title="No workouts in this range"
                description="When workouts are imported or logged for these dates, they will automatically appear here."
              />
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  topSpacer: { height: 0 },
  monthItem: {
    height: CALENDAR_MONTH_ITEM_HEIGHT,
  },
  emptyWrapper: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
});

