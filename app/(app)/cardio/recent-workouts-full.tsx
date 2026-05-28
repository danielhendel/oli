import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, Pressable, FlatList, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import { useWorkoutsCalendarRange } from "@/lib/data/workouts/useWorkoutsCalendar";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { reconcileWorkoutSessionsForDay, type ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import {
  buildWorkoutSessionSurfaceModel,
  pickWorkoutForSessionActions,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import {
  cardioSessionDistanceMiles,
  filterCardioHistoryRowsDedupeOverlappingOther,
  resolveCardioSessionDisplayName,
  isDisplayableCardioHistorySession,
} from "@/lib/data/workouts/cardioSessionPresentation";
import {
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { WorkoutActionSheet, type WorkoutActionAnchor } from "@/lib/ui/WorkoutActionSheet";
import type { DayKey } from "@/lib/ui/calendar/types";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const HISTORY_SCREEN_HORIZONTAL_GUTTER = 24;

const MONTH_HEADER_ROW_TEXT = {
  fontSize: 27,
  fontWeight: "700" as const,
  lineHeight: 32,
  letterSpacing: -0.45,
} as const;

/** Matches Strength overview “This Week” card list row title (`overview.tsx` styles.recentTitle). */
const THIS_WEEK_CARD_RECENT_TITLE_STYLE = {
  fontSize: 17,
  fontWeight: "600" as const,
  color: "#1C1C1E",
  letterSpacing: -0.28,
  lineHeight: 21,
};

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

type HistoryRow = {
  key: string;
  day: DayKey;
  session: ReconciledWorkoutSession;
};

function toYear(day: DayKey): number {
  return Number(day.slice(0, 4));
}

function toMonthIndex(day: DayKey): number {
  return Number(day.slice(5, 7)) - 1;
}

function formatWorkoutDayLabel(dayKey: DayKey): string {
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

/** Miles label for month header / accessibility; one decimal when useful. */
function formatMonthTotalMiles(sumMiles: number): string {
  if (!Number.isFinite(sumMiles) || sumMiles <= 0) return "0 mi";
  const nearestInt = Math.round(sumMiles);
  if (Math.abs(sumMiles - nearestInt) < 0.05) return `${nearestInt} mi`;
  return `${(Math.round(sumMiles * 10) / 10).toFixed(1)} mi`;
}

function formatMilesSegmentForRow(miles: number): string {
  const nearestInt = Math.round(miles);
  if (Math.abs(miles - nearestInt) < 0.05) return `${nearestInt} mi`;
  return `${(Math.round(miles * 10) / 10).toFixed(1)} mi`;
}

function formatCardioHistoryMetadataLine(
  session: ReconciledWorkoutSession,
  durationMinutes: number | null,
): string {
  const miles = cardioSessionDistanceMiles(session);
  const parts: string[] = [];
  if (miles != null && Number.isFinite(miles) && miles > 0) {
    parts.push(formatMilesSegmentForRow(miles));
  }
  const dur = formatWorkoutDurationLabel(durationMinutes);
  if (dur !== "—") parts.push(dur);
  return parts.join(" · ");
}

function sumCardioMilesForSessions(sessions: readonly ReconciledWorkoutSession[]): number {
  let sum = 0;
  for (const s of sessions) {
    const m = cardioSessionDistanceMiles(s);
    if (m != null && Number.isFinite(m) && m > 0) sum += m;
  }
  return sum;
}

export default function CardioRecentSessionsFullScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const today = getTodayDayKeyLocal();
  const [refreshEpoch] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<WorkoutActionAnchor | null>(null);
  const [selectedWorkoutForMenu, setSelectedWorkoutForMenu] = useState<{ day: DayKey; session: ReconciledWorkoutSession } | null>(
    null,
  );

  const { start, end } = useMemo(() => computeWorkoutOverviewSharedCalendarRange(today), [today]);
  const calendarRange = useWorkoutsCalendarRange(start, end, {
    refreshEpoch,
    debugHydrateLabel: "cardio-history-full",
  });
  const days = calendarRange.status === "ready" ? mapWorkoutCalendarDaysForDomain(calendarRange.days, "cardio") : [];
  const durableTitlesByWorkoutId = calendarRange.status === "ready" ? calendarRange.durableTitlesByWorkoutId : {};

  const allRowsAscending = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [];
    for (const d of days) {
      const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
      for (const session of sessions) {
        rows.push({
          key: `${d.day}:${session.id}`,
          day: d.day as DayKey,
          session,
        });
      }
    }
    rows.sort((a, b) => {
      if (a.day !== b.day) return a.day < b.day ? -1 : 1;
      const aStart = a.session.start ?? "";
      const bStart = b.session.start ?? "";
      if (aStart === bStart) return a.session.id.localeCompare(b.session.id);
      return aStart.localeCompare(bStart);
    });
    const displayable = rows.filter((r) => isDisplayableCardioHistorySession(r.session));
    return filterCardioHistoryRowsDedupeOverlappingOther(displayable);
  }, [days]);

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

  const workoutIdsForOverrides = useMemo(
    () => allRowsAscending.flatMap((entry) => entry.session.workouts.map((w) => w.id)),
    [allRowsAscending],
  );
  const { overridesByWorkoutId } = useWorkoutOverrides(workoutIdsForOverrides);

  useEffect(() => {
    if (calendarRange.status !== "ready") return;
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
  }, [calendarRange.status, selectedYear, selectedMonth, yearsWithData, currentYear, currentMonth, monthsWithDataByYear]);

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

  const monthTotalMiles = useMemo(
    () => sumCardioMilesForSessions(visibleRows.map((r) => r.session)),
    [visibleRows],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuAnchor(null);
    setSelectedWorkoutForMenu(null);
  }, []);

  const selectedMenuSessionRef = useRef<ReconciledWorkoutSession | null>(null);
  selectedMenuSessionRef.current = selectedWorkoutForMenu?.session ?? null;

  const openEditRoute = useCallback(
    (mode: "rename" | "duration" | "type") => {
      if (!selectedWorkoutForMenu) return;
      const session = selectedMenuSessionRef.current ?? selectedWorkoutForMenu.session;
      const workout = pickWorkoutForSessionActions(session);
      if (!workout) return;
      const journalSummary = null;
      const surface = buildWorkoutSessionSurfaceModel(
        session,
        overridesByWorkoutId,
        "cardio",
        journalSummary,
        durableTitlesByWorkoutId,
      );
      const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
      const resolvedAction = resolveWorkoutDisplay(
        workout,
        sessionOverride ?? overridesByWorkoutId[workout.id] ?? null,
      );
      const resolvedMetrics = resolveWorkoutDisplay(
        surface.metricsWorkout,
        sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
      );
      closeMenu();
      router.push({
        pathname: `/(app)/workouts/edit/${mode}`,
        params: {
          workoutId: workout.id,
          currentTitle: surface.displayTitle,
          titleAnchorObservedAt: workout.start ?? workout.observedAt,
          currentDurationMinutes:
            typeof resolvedMetrics.displayDurationMinutes === "number"
              ? String(Math.round(resolvedMetrics.displayDurationMinutes))
              : "",
          currentWorkoutType: resolvedAction.displayWorkoutType,
        },
      });
    },
    [selectedWorkoutForMenu, overridesByWorkoutId, durableTitlesByWorkoutId, closeMenu, router],
  );

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
      headerTitle: () => (
        <Pressable
          onPress={() => {
            // Year picker is deferred; make this interactive now.
          }}
          accessibilityRole="button"
          accessibilityLabel={`Selected year ${selectedYear ?? currentYear}. Double tap to change year.`}
          hitSlop={8}
          style={({ pressed }) => [styles.yearPressable, pressed && styles.yearPressablePressed]}
        >
          <Text style={styles.yearTitle}>{selectedYear ?? currentYear}</Text>
        </Pressable>
      ),
      title: "",
    });
  }, [navigation, selectedYear, currentYear]);

  const renderRow = useCallback(
    ({ item, index }: { item: HistoryRow; index: number }) => {
      const surface = buildWorkoutSessionSurfaceModel(
        item.session,
        overridesByWorkoutId,
        "cardio",
        null,
        durableTitlesByWorkoutId,
      );
      const sessionOverride = pickWorkoutOverrideForSession(item.session, overridesByWorkoutId);
      const resolvedMetrics = resolveWorkoutDisplay(
        surface.metricsWorkout,
        sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
      );
      const resolvedDuration = resolveWorkoutDisplayDurationMinutes({
        overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
        sessionDurationMinutes: null,
        fallbackWorkoutDurationMinutes: surface.metricsWorkout.durationMinutes ?? item.session.durationMinutes,
      });
      const titleLine = resolveCardioSessionDisplayName(
        item.session,
        overridesByWorkoutId,
        durableTitlesByWorkoutId,
      );
      const metaLine = formatCardioHistoryMetadataLine(item.session, resolvedDuration);
      const isLast = index === visibleRows.length - 1;

      return (
        <View style={styles.recentRowWrap}>
          <Pressable
            style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
            onPress={() => {
              router.push({
                pathname: "/(app)/cardio/day/[day]",
                params: { day: item.day },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Open workout details ${surface.actionWorkout.id}`}
          >
            <View style={styles.recentRowTextCol}>
              <Text style={styles.recentDate}>{formatWorkoutDayLabel(item.day)}</Text>
              <Text style={styles.recentTitle} numberOfLines={2} ellipsizeMode="tail">
                {titleLine}
              </Text>
              <Text style={styles.recentMeta} numberOfLines={2} ellipsizeMode="tail">
                {metaLine}
              </Text>
            </View>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                const native = e?.nativeEvent;
                setMenuAnchor({
                  x: typeof native?.pageX === "number" ? native.pageX : 320,
                  y: typeof native?.pageY === "number" ? native.pageY : 220,
                  width: 44,
                  height: 44,
                });
                setSelectedWorkoutForMenu({ day: item.day, session: item.session });
                setMenuOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Workout actions ${surface.actionWorkout.id}`}
              hitSlop={8}
              style={styles.rowMenuBtn}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#8E8E93" />
            </Pressable>
          </Pressable>
          {!isLast ? <View style={styles.rowDividerInset} /> : null}
        </View>
      );
    },
    [router, overridesByWorkoutId, durableTitlesByWorkoutId, visibleRows.length],
  );

  const monthSectionTitle = selectedMonth != null ? (MONTH_FULL[selectedMonth] ?? "") : "";
  const monthMilesLabel = formatMonthTotalMiles(monthTotalMiles);

  const listSectionHeader =
    selectedMonth != null ? (
      <View
        style={styles.listSectionHeaderRow}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${monthSectionTitle}. Total distance ${monthMilesLabel}.`}
      >
        <Text style={styles.listSectionMonth} importantForAccessibility="no">
          {monthSectionTitle}
        </Text>
        <Text style={styles.listSectionCount} importantForAccessibility="no">
          {monthMilesLabel}
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

  if (calendarRange.status === "partial") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={[...screenEdges]}>
        <LoadingState message="Loading cardio history…" />
      </ScreenContainer>
    );
  }

  if (calendarRange.status === "error") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={[...screenEdges]}>
        <ErrorState message={calendarRange.error} requestId={calendarRange.requestId} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={[...screenEdges]}>
      <View style={styles.body}>
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
                title="No cardio sessions yet"
                description="Cardio sessions logged this month will appear here."
              />
            </View>
          }
        />
        <WorkoutActionSheet
          visible={menuOpen && !!selectedWorkoutForMenu}
          anchor={menuAnchor}
          onClose={closeMenu}
          onViewDetails={() => {
            if (!selectedWorkoutForMenu) return;
            const day = selectedWorkoutForMenu.day;
            closeMenu();
            router.push({ pathname: "/(app)/cardio/day/[day]", params: { day } });
          }}
          onDoItAgain={() => {
            closeMenu();
            router.push("/(app)/cardio/log");
          }}
          onRename={() => openEditRoute("rename")}
          onEditDuration={() => openEditRoute("duration")}
          onEditType={() => openEditRoute("type")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  yearPressable: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  yearPressablePressed: {
    opacity: 0.72,
  },
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
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 0,
  },
  recentRowPressed: {
    opacity: 0.7,
  },
  recentRowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  recentDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#636366",
    letterSpacing: -0.08,
    marginBottom: 5,
  },
  recentTitle: {
    ...THIS_WEEK_CARD_RECENT_TITLE_STYLE,
    marginBottom: 8,
  },
  recentMeta: {
    fontSize: 14,
    fontWeight: "500",
    color: "#636366",
    letterSpacing: -0.12,
    marginBottom: 14,
  },
  rowDividerInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
    marginLeft: 16,
    marginRight: 56,
    marginBottom: 0,
  },
  rowMenuBtn: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
  },
});
