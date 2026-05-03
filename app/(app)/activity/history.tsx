/**
 * Full Activity history — step days with tier pills and baseline deltas (Strength/Cardio history pattern).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { buildActivityBaselineCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { parseActivityDailyDetailsNumericSteps } from "@/lib/data/activity/activityOverviewCardModel";
import { formatSignedBaselineDelta } from "@/lib/data/activity/activityTodayBaselineDelta";
import { getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import { useActivityStepsRollupForKeys } from "@/lib/data/activity/useActivityStepsRollupMap";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { EmptyState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
import { enumerateDaysInclusive, getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";
import { getStepRatingActivityDescriptorPill } from "@/lib/utils/activityStepRating";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const HISTORY_SCREEN_HORIZONTAL_GUTTER = 24;

const MONTH_HEADER_ROW_TEXT = {
  fontSize: 27,
  fontWeight: "700" as const,
  lineHeight: 32,
  letterSpacing: -0.45,
} as const;

type HistoryRow = {
  key: string;
  day: DayKey;
  steps: number;
};

function toYear(day: DayKey): number {
  return Number(day.slice(0, 4));
}

function toMonthIndex(day: DayKey): number {
  return Number(day.slice(5, 7)) - 1;
}

function formatActivityDayHeading(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? "";
  const mon = MONTH_SHORT[d.getUTCMonth()] ?? "";
  const dayNum = d.getUTCDate();
  return `${wd} • ${mon} ${dayNum}`;
}

function selectDefaultMonthForYear(args: {
  selectedYear: number;
  currentYear: number;
  currentMonth: number;
  monthsWithData: number[];
}): number {
  if (args.monthsWithData.length === 0) return args.currentMonth;
  if (args.selectedYear === args.currentYear && args.monthsWithData.includes(args.currentMonth)) {
    return args.currentMonth;
  }
  return args.monthsWithData[args.monthsWithData.length - 1] ?? args.currentMonth;
}

export default function ActivityHistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const today = getTodayDayKeyLocal();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { start, end } = useMemo(() => computeWorkoutOverviewSharedCalendarRange(today), [today]);
  const dayKeys = useMemo(() => enumerateDaysInclusive(start, end), [start, end]);
  const rollup = useActivityStepsRollupForKeys(dayKeys);

  const { hkToday } = useActivityHealthKitTodayStepsCard({
    todayDayKey: today,
    enabled: Boolean(user) && !initializing,
  });

  const displayRollup = useMemo(() => {
    const m = { ...rollup.rollupDisplayByDay };
    if (user && hkToday.status === "ready" && typeof hkToday.steps === "number") {
      m[today] = { kind: "numeric" as const, steps: hkToday.steps };
    }
    return m;
  }, [rollup.rollupDisplayByDay, hkToday, today, user]);

  const overviewAnchorEndDay = useMemo(() => getActivityOverviewAnchorEndDay(today), [today]);
  const baselineMeanSteps = useMemo(() => {
    const baselineModel = buildActivityBaselineCardModel({
      overviewAnchorEndDay,
      rollupByDay: rollup.rollupDisplayByDay,
    });
    return parseActivityDailyDetailsNumericSteps(baselineModel.compactStatsSummary);
  }, [overviewAnchorEndDay, rollup.rollupDisplayByDay]);

  const allRowsAscending = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [];
    for (const dayKey of dayKeys) {
      const e = displayRollup[dayKey];
      if (e?.kind !== "numeric") continue;
      rows.push({
        key: dayKey,
        day: dayKey,
        steps: Math.round(e.steps),
      });
    }
    return rows;
  }, [dayKeys, displayRollup]);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const yearsWithData = useMemo(() => {
    const years = new Set<number>();
    for (const row of allRowsAscending) years.add(toYear(row.day));
    return [...years].sort((a, b) => a - b);
  }, [allRowsAscending]);

  const monthsWithDataByYear = useMemo(() => {
    const byYear = new Map<number, number[]>();
    for (const year of yearsWithData) byYear.set(year, []);
    for (const row of allRowsAscending) {
      const y = toYear(row.day);
      const m = toMonthIndex(row.day);
      const list = byYear.get(y) ?? [];
      if (!list.includes(m)) list.push(m);
      byYear.set(y, list);
    }
    for (const [year, months] of byYear.entries()) {
      byYear.set(
        year,
        months.sort((a, b) => a - b),
      );
    }
    return byYear;
  }, [allRowsAscending, yearsWithData]);

  useEffect(() => {
    if (rollup.status !== "ready") return;
    if (selectedYear != null && selectedMonth != null) return;
    const defaultYear =
      yearsWithData.includes(currentYear) ? currentYear : (yearsWithData[yearsWithData.length - 1] ?? currentYear);
    const monthsWithData = monthsWithDataByYear.get(defaultYear) ?? [];
    const defaultMonth = selectDefaultMonthForYear({
      selectedYear: defaultYear,
      currentYear,
      currentMonth,
      monthsWithData,
    });
    setSelectedYear(defaultYear);
    setSelectedMonth(defaultMonth);
  }, [rollup.status, selectedYear, selectedMonth, yearsWithData, currentYear, currentMonth, monthsWithDataByYear]);

  useEffect(() => {
    if (selectedYear == null) return;
    if (selectedMonth == null) return;
    const monthsWithData = monthsWithDataByYear.get(selectedYear) ?? [];
    if (monthsWithData.length === 0) return;
    if (monthsWithData.includes(selectedMonth)) return;
    setSelectedMonth(
      selectDefaultMonthForYear({
        selectedYear,
        currentYear,
        currentMonth,
        monthsWithData,
      }),
    );
  }, [selectedYear, selectedMonth, monthsWithDataByYear, currentYear, currentMonth]);

  const visibleRows = useMemo(() => {
    if (selectedYear == null || selectedMonth == null) return [] as HistoryRow[];
    return allRowsAscending.filter(
      (entry) => toYear(entry.day) === selectedYear && toMonthIndex(entry.day) === selectedMonth,
    );
  }, [allRowsAscending, selectedYear, selectedMonth]);

  const monthTotalSteps = useMemo(
    () => visibleRows.reduce((acc, r) => acc + r.steps, 0),
    [visibleRows],
  );

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
      headerTitle: () => (
        <Text style={styles.yearTitle} accessibilityRole="header">
          {selectedYear ?? currentYear}
        </Text>
      ),
      title: "",
    });
  }, [navigation, selectedYear, currentYear]);

  const renderRow = useCallback(
    ({ item, index }: { item: HistoryRow; index: number }) => {
      const tierPill = getStepRatingActivityDescriptorPill(item.steps);
      const deltaText = formatSignedBaselineDelta(item.steps, baselineMeanSteps);
      const deltaPart = deltaText != null ? ` Delta ${deltaText} versus baseline.` : "";
      const a11y = `${formatActivityDayHeading(item.day)}. ${item.steps.toLocaleString()} steps. ${tierPill.label}.${deltaPart}`;
      const isLast = index === visibleRows.length - 1;

      return (
        <View style={styles.recentRowWrap} testID={`activity-history-row-${item.day}`}>
          <Pressable
            style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
            onPress={() => {
              router.push({ pathname: "/(app)/activity/day/[day]", params: { day: item.day } });
            }}
            accessibilityRole="button"
            accessibilityLabel={a11y}
          >
            <Text style={styles.recentDate} accessibilityElementsHidden importantForAccessibility="no">
              {formatActivityDayHeading(item.day)}
            </Text>
            <View style={styles.rowMain}>
              <View style={styles.leftCluster}>
                <Text style={styles.stepsLine} numberOfLines={1}>
                  {item.steps.toLocaleString()} steps
                </Text>
                <ActivityRatingPill
                  label={tierPill.label}
                  color={tierPill.color}
                  backgroundColor={tierPill.backgroundColor}
                  emphasis="subtle"
                  compactChrome
                  labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                  testID={`activity-history-tier-pill-${item.day}`}
                />
              </View>
              {deltaText != null ? (
                <Text style={styles.deltaFigure} numberOfLines={1}>
                  {deltaText}
                </Text>
              ) : (
                <View style={styles.deltaPlaceholder} />
              )}
            </View>
          </Pressable>
          {!isLast ? <View style={styles.rowDividerInset} /> : null}
        </View>
      );
    },
    [baselineMeanSteps, router, visibleRows.length],
  );

  const monthSectionTitle = selectedMonth != null ? (MONTH_FULL[selectedMonth] ?? "") : "";
  const monthStepsLabel = `${monthTotalSteps.toLocaleString()} steps`;

  const listSectionHeader =
    selectedMonth != null ? (
      <View
        style={styles.listSectionHeaderRow}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${monthSectionTitle}. Total ${monthStepsLabel}.`}
      >
        <Text style={styles.listSectionMonth} importantForAccessibility="no">
          {monthSectionTitle}
        </Text>
        <Text style={styles.listSectionCount} importantForAccessibility="no">
          {monthStepsLabel}
        </Text>
      </View>
    ) : null;

  const monthSelector = (
    <View style={styles.monthSelectorWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthSelectorContent}>
        {MONTH_SHORT.map((label, idx) => {
          const selected = selectedMonth === idx;
          return (
            <Pressable
              key={label}
              onPress={() => setSelectedMonth(idx)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${label}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.monthPill,
                selected && styles.monthPillSelected,
                pressed && styles.monthPillPressed,
              ]}
            >
              <Text style={[styles.monthPillLabel, selected && styles.monthPillLabelSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const screenEdges = ["left", "right", "bottom"] as const;

  if (!user || initializing) {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={[...screenEdges]}>
        <EmptyState title="Sign in to view activity history" description="Sign in to load your step history." />
      </ScreenContainer>
    );
  }

  if (rollup.status === "partial") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={[...screenEdges]}>
        <LoadingState message="Loading activity history…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={[...screenEdges]}>
      <View style={styles.body} testID="activity-history-screen">
        {monthSelector}
        <FlatList
          data={visibleRows}
          renderItem={renderRow}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            listSectionHeader != null ? <View style={styles.listSectionHeaderWrap}>{listSectionHeader}</View> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                title="No step days this month"
                description="Days with recorded steps in this month will appear here."
              />
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  yearTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.35,
  },
  monthSelectorWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60,60,67,0.12)",
    paddingTop: 6,
    paddingBottom: 6,
  },
  monthSelectorContent: {
    paddingHorizontal: HISTORY_SCREEN_HORIZONTAL_GUTTER,
    gap: 10,
    alignItems: "center",
  },
  monthPill: {
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  monthPillSelected: {
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  monthPillPressed: {
    opacity: 0.75,
  },
  monthPillLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3C3C43",
  },
  monthPillLabelSelected: {
    color: SYSTEM_ACCENT,
    fontWeight: "700",
  },
  listSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  listSectionHeaderWrap: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  listSectionMonth: {
    ...MONTH_HEADER_ROW_TEXT,
    flex: 1,
    minWidth: 0,
    color: "#1C1C1E",
  },
  listSectionCount: {
    ...MONTH_HEADER_ROW_TEXT,
    flexShrink: 0,
    color: "#8E8E93",
    fontVariant: ["tabular-nums"],
  },
  listContent: {
    paddingHorizontal: HISTORY_SCREEN_HORIZONTAL_GUTTER,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyWrap: {
    paddingTop: 36,
  },
  recentRowWrap: {
    width: "100%",
    paddingVertical: 6,
  },
  recentRow: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  recentRowPressed: {
    opacity: 0.7,
  },
  recentDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#636366",
    letterSpacing: -0.08,
    marginBottom: 6,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  leftCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  stepsLine: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.28,
    lineHeight: 21,
  },
  deltaFigure: {
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#1C1C1E",
    letterSpacing: -0.26,
    flexShrink: 0,
    textAlign: "right",
    minWidth: 72,
  },
  deltaPlaceholder: {
    minWidth: 72,
  },
  rowDividerInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
    marginLeft: 0,
    marginRight: 0,
    marginTop: 12,
  },
});
