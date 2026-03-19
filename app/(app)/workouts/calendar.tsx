import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Text, type ViewToken } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import type { DayKey } from "@/lib/ui/calendar/types";
import { useWorkoutsCalendarRange } from "@/lib/data/workouts/useWorkoutsCalendar";
import { getMonthFirstDay, getMonthLastDay, type MonthYear, clampMonthYear } from "@/lib/ui/calendar/dateUtils";

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
  const todayMonth = monthYearFromToday();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [windowBounds, setWindowBounds] = useState(() => ({
    startIndex: MONTHS_BACK,
    endIndex: MONTHS_BACK,
  }));
  const [markerMap, setMarkerMap] = useState<Map<DayKey, boolean>>(new Map());
  const months = useMemo(() => buildMonthRange(todayMonth), [todayMonth.year, todayMonth.month]);
  const todayMonthIndex = MONTHS_BACK;
  const flatListRef = useRef<FlatList<CalendarMonthModel>>(null);

  const clampedStart = Math.max(0, Math.min(windowBounds.startIndex, months.length - 1));
  const clampedEnd = Math.max(clampedStart, Math.min(windowBounds.endIndex, months.length - 1));
  const startDay = getMonthFirstDay(months[clampedStart]!.monthYear);
  const endDay = getMonthLastDay(months[clampedEnd]!.monthYear);
  const range = useWorkoutsCalendarRange(startDay, endDay, { refreshEpoch });

  useEffect(() => {
    if (range.status !== "ready") return;
    setMarkerMap((prev) => {
      const next = new Map(prev);
      for (const d of range.days) {
        if (d.workouts.length > 0) next.set(d.day, true);
        else next.delete(d.day);
      }
      if (next.size === prev.size) {
        let same = true;
        for (const [k, v] of next) {
          if (prev.get(k) !== v) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return next;
    });
  }, [range.status, range.status === "ready" ? range.days : null]);

  useEffect(() => {
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
      headerLeft: () => (
        <Pressable
          onPress={navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed && styles.headerBackButtonPressed,
          ]}
        >
          <Text style={styles.headerBackIcon}>‹</Text>
        </Pressable>
      ),
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

  if (range.status === "partial" && markerMap.size === 0) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading workouts calendar…" />
      </ScreenContainer>
    );
  }

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

  const hasMarker = (day: DayKey): boolean => {
    return markerMap.get(day) === true;
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
            <MonthGrid monthYear={item.monthYear} hasMarker={hasMarker} onDayPress={onDayPress} />
          </View>
        )}
        ListFooterComponent={
          !hasAnyWorkouts ? (
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
  headerBackButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackButtonPressed: {
    opacity: 0.7,
  },
  headerBackIcon: {
    fontSize: 23,
    color: "#1C1C1E",
    fontWeight: "600",
    transform: [{ translateX: -0.5 }],
  },
  emptyWrapper: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
});

