import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { BodyMonthGrid } from "@/lib/ui/body/BodyMonthGrid";
import { clampMonthYear, type MonthYear } from "@/lib/ui/calendar/dateUtils";
import { useBodyCompositionData } from "@/lib/data/body/useBodyCompositionData";

type MonthModel = { key: string; monthYear: MonthYear };
const MONTHS_BACK = 12;
const CALENDAR_MONTH_ITEM_HEIGHT = 372;

function initialBodyCalendarMonth(): MonthYear {
  return { year: 2026, month: 1 };
}

function shiftMonth(monthYear: MonthYear, delta: number): MonthYear {
  return clampMonthYear({ year: monthYear.year, month: monthYear.month + delta });
}

function buildMonthRange(center: MonthYear): MonthModel[] {
  const out: MonthModel[] = [];
  for (let i = -MONTHS_BACK; i <= 12; i += 1) {
    const m = shiftMonth(center, i);
    out.push({ key: `${m.year}-${String(m.month).padStart(2, "0")}`, monthYear: m });
  }
  return out;
}

export default function BodyCalendarScreen() {
  const router = useRouter();
  const initialMonth = initialBodyCalendarMonth();
  const months = useMemo(() => buildMonthRange(initialMonth), [initialMonth.year, initialMonth.month]);
  const body = useBodyCompositionData(new Date().toISOString().slice(0, 10), "5Y");

  return (
    <ScreenContainer>
      <FlatList
        data={months}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.scroll}
        initialScrollIndex={MONTHS_BACK}
        getItemLayout={(_, index) => ({
          length: CALENDAR_MONTH_ITEM_HEIGHT,
          offset: CALENDAR_MONTH_ITEM_HEIGHT * index,
          index,
        })}
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

