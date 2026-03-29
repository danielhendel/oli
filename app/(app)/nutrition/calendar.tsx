import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, FlatList, type ViewToken } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ScreenContainer, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NutritionMonthGrid } from "@/lib/ui/calendar/NutritionMonthGrid";
import type { DayKey } from "@/lib/ui/calendar/types";
import { getMonthFirstDay, getMonthLastDay, type MonthYear, clampMonthYear } from "@/lib/ui/calendar/dateUtils";
import { useNutritionLoggedDaysForRange } from "@/lib/hooks/useNutritionLoggedDaysForRange";

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

export default function NutritionCalendarScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const todayMonth = monthYearFromToday();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [windowBounds, setWindowBounds] = useState(() => ({
    startIndex: MONTHS_BACK,
    endIndex: MONTHS_BACK,
  }));
  const months = useMemo(() => buildMonthRange(todayMonth), [todayMonth.year, todayMonth.month]);
  const todayMonthIndex = MONTHS_BACK;
  const flatListRef = useRef<FlatList<CalendarMonthModel>>(null);

  const clampedStart = Math.max(0, Math.min(windowBounds.startIndex, months.length - 1));
  const clampedEnd = Math.max(clampedStart, Math.min(windowBounds.endIndex, months.length - 1));
  const startDay = getMonthFirstDay(months[clampedStart]!.monthYear);
  const endDay = getMonthLastDay(months[clampedEnd]!.monthYear);

  const range = useNutritionLoggedDaysForRange(startDay, endDay, {
    enabled: !!user,
    refreshEpoch,
  });

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

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

  if (range.status === "error") {
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

  const loggedDays = range.status === "ready" ? range.loggedDays : new Set<DayKey>();
  const hasAny = loggedDays.size > 0;
  const rangeSettledForEmpty = range.status === "ready" && !range.refreshing;
  const showEmptyFooter = rangeSettledForEmpty && !hasAny;

  const markerForDay = (day: DayKey): boolean => loggedDays.has(day);

  const onDayPress = (day: DayKey) => {
    router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day } });
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
            <NutritionMonthGrid monthYear={item.monthYear} markerForDay={markerForDay} onDayPress={onDayPress} />
          </View>
        )}
        ListFooterComponent={
          showEmptyFooter ? (
            <View style={styles.emptyWrapper}>
              <EmptyState
                title="No nutrition logs in this range"
                description="When you log nutrition for these dates, they will appear on the calendar."
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
