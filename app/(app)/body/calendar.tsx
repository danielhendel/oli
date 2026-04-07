import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, View, type ViewToken } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { BodyMonthGrid } from "@/lib/ui/body/BodyMonthGrid";
import { clampMonthYear, getTodayDayKeyLocal, type MonthYear } from "@/lib/ui/calendar/dateUtils";
import { headerYearFromViewableMonthItems } from "@/lib/ui/calendar/moduleCalendarHeaderYear";
import { useModuleCalendarYearNavigationHeader } from "@/lib/ui/calendar/useModuleCalendarYearNavigationHeader";
import { useBodyCompositionData } from "@/lib/data/body/useBodyCompositionData";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

type MonthModel = { key: string; monthYear: MonthYear };
const MONTHS_BACK = 12;
const MONTHS_FORWARD = 12;
const CALENDAR_MONTH_ITEM_HEIGHT = 372;

function monthYearFromToday(): MonthYear {
  const d = getTodayDayKeyLocal();
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return clampMonthYear({ year: y, month: m });
}

function shiftMonth(monthYear: MonthYear, delta: number): MonthYear {
  return clampMonthYear({ year: monthYear.year, month: monthYear.month + delta });
}

function buildMonthRange(center: MonthYear): MonthModel[] {
  const out: MonthModel[] = [];
  for (let i = -MONTHS_BACK; i <= MONTHS_FORWARD; i += 1) {
    const m = shiftMonth(center, i);
    out.push({ key: `${m.year}-${String(m.month).padStart(2, "0")}`, monthYear: m });
  }
  return out;
}

export default function BodyCalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const todayMonth = monthYearFromToday();
  const months = useMemo(() => buildMonthRange(todayMonth), [todayMonth.year, todayMonth.month]);
  const todayMonthIndex = MONTHS_BACK;
  const flatListRef = useRef<FlatList<MonthModel>>(null);
  const [headerYear, setHeaderYear] = useState(todayMonth.year);

  const body = useBodyCompositionData(new Date().toISOString().slice(0, 10), "5Y");

  useModuleCalendarYearNavigationHeader(navigation, headerYear);

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
      const y = headerYearFromViewableMonthItems(viewableItems, months);
      if (y != null) setHeaderYear(y);
    },
    [months],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
  }).current;

  /** Stack header sits below status bar; omit top safe-area + outer padding to avoid a band under the nav (see workouts day screen). */
  const screenEdges = ["left", "right", "bottom"] as const;

  return (
    <ScreenContainer backgroundColor={UI_APP_SCREEN_BG} padded={false} edges={[...screenEdges]}>
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
        {...(Platform.OS === "ios" ? { contentInsetAdjustmentBehavior: "never" as const } : {})}
        renderItem={({ item }) => (
          <View style={styles.monthItem}>
            <BodyMonthGrid
              monthYear={item.monthYear}
              markerForDay={(day) => body.markedDays.has(day)}
              onDayPress={(day) => router.push({ pathname: "/(app)/body/day/[day]", params: { day } })}
            />
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  monthItem: { height: CALENDAR_MONTH_ITEM_HEIGHT },
});
