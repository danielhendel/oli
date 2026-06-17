import React, { useLayoutEffect, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useNavigation } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import { completedSleepMinutesForCalendarDay } from "@/lib/data/sleep/sleepCompletedNights";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { MetricLogRow } from "@/lib/ui/logs/MetricLogRow";
import { formatMetricLogDateFromDayKey } from "@/lib/ui/logs/formatMetricLogDate";
import { EmptyState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { enumerateDaysInclusive, getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

type SleepLogRow = {
  day: DayKey;
  durationLabel: string;
  efficiencyLabel: string | null;
  deepRemLabel: string | null;
};

export default function SleepLogScreen() {
  const navigation = useNavigation();
  const { user, initializing } = useAuth();
  const today = getTodayDayKeyLocal();
  const { start, end } = useMemo(() => computeWorkoutOverviewSharedCalendarRange(today), [today]);
  const dayKeys = useMemo(() => enumerateDaysInclusive(start, end), [start, end]);
  const rollup = useSleepNightRollupMap(dayKeys);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
      title: "Sleep Log",
    });
  }, [navigation]);

  const rows = useMemo<SleepLogRow[]>(() => {
    const out: SleepLogRow[] = [];
    for (const day of [...dayKeys].reverse()) {
      const cell = rollup.sleepNightByDay[day];
      if (!cell?.settled) continue;
      const minutes = completedSleepMinutesForCalendarDay(day, cell);
      if (minutes == null || minutes <= 0) continue;
      const night = cell.view?.sleepNight;
      const durationLabel = formatSleepDurationMinutes(minutes);
      const efficiencyLabel =
        night?.efficiency != null && Number.isFinite(night.efficiency)
          ? `${Math.round(night.efficiency)}% efficiency`
          : null;
      const deepRemParts: string[] = [];
      if (night?.deepMinutes != null && night.deepMinutes > 0) {
        deepRemParts.push(`${formatSleepDurationMinutes(night.deepMinutes)} deep`);
      }
      if (night?.remMinutes != null && night.remMinutes > 0) {
        deepRemParts.push(`${formatSleepDurationMinutes(night.remMinutes)} REM`);
      }
      out.push({
        day,
        durationLabel,
        efficiencyLabel,
        deepRemLabel: deepRemParts.length > 0 ? deepRemParts.join(" · ") : null,
      });
    }
    return out;
  }, [dayKeys, rollup.sleepNightByDay]);

  if (initializing || rollup.status === "partial") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <LoadingState message="Loading sleep log…" />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <EmptyState title="Sign in required" description="Sign in to view your sleep log." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={["left", "right", "bottom"]}>
      <View style={styles.body} testID="sleep-log-screen">
        <FlatList
          data={rows}
          keyExtractor={(item) => item.day}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const dateLabel = formatMetricLogDateFromDayKey(item.day);
            const primaryMetric = `Sleep ${item.durationLabel}${item.efficiencyLabel ? ` · ${item.efficiencyLabel}` : ""}`;
            return (
              <MetricLogRow
                testID={`sleep-log-row-${item.day}`}
                dateLabel={dateLabel}
                primaryMetric={primaryMetric}
                secondaryMetric={item.deepRemLabel}
                accessibilityLabel={`${dateLabel}. ${primaryMetric}`}
                showMenu={false}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No sleep nights yet"
              description="Completed sleep nights from your devices will appear here. Entries are view-only."
            />
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
});
