import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, Pressable, FlatList, ScrollView, Modal, Alert } from "react-native";
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
import { useWorkoutsCalendarRange, applyAuthoritativeWorkoutDeletionLocal } from "@/lib/data/workouts/useWorkoutsCalendar";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { reconcileWorkoutSessionsForDay, type ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import { useWorkoutOverrides, clearWorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildWorkoutSessionSurfaceModel,
  pickJournalSummaryForStrengthSession,
  pickStrengthDeleteTargetWorkout,
  pickWorkoutForSessionActions,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import { listManualWorkoutDaySummaries, type ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { formatWorkoutDurationLabel, resolveWorkoutDisplay, resolveWorkoutDisplayDurationMinutes } from "@/lib/data/workouts/workoutDisplay";
import { WorkoutActionSheet, type WorkoutActionAnchor } from "@/lib/ui/WorkoutActionSheet";
import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import type { DayKey } from "@/lib/ui/calendar/types";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** Matches premium list inset on this screen (aligned with month strip + rows). */
const HISTORY_SCREEN_HORIZONTAL_GUTTER = 24;

/** Month name + “N wo” share these metrics; hierarchy is color-only. */
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

function countJournalSetsForDisplay(summary: ManualWorkoutDaySummary | null): number {
  if (summary == null) return 0;
  let n = 0;
  for (const ex of summary.exercises) n += ex.sets.length;
  return n;
}

function formatStrengthMetaLine(durationLabel: string, journalSummary: ManualWorkoutDaySummary | null): string {
  const n = countJournalSetsForDisplay(journalSummary);
  if (n > 0) return `${durationLabel} · ${n} set${n === 1 ? "" : "s"}`;
  return durationLabel;
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

export default function RecentWorkoutsFullScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const today = getTodayDayKeyLocal();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<WorkoutActionAnchor | null>(null);
  const [selectedWorkoutForMenu, setSelectedWorkoutForMenu] = useState<{ day: DayKey; session: ReconciledWorkoutSession } | null>(null);
  const [pendingDeleteWorkoutId, setPendingDeleteWorkoutId] = useState<string | null>(null);
  const [deleteWorkoutSubmitting, setDeleteWorkoutSubmitting] = useState(false);
  const [manualWorkoutSummaries, setManualWorkoutSummaries] = useState<ManualWorkoutDaySummary[]>([]);
  const { start, end } = useMemo(() => computeWorkoutOverviewSharedCalendarRange(today), [today]);
  const calendarRange = useWorkoutsCalendarRange(start, end, { refreshEpoch, debugHydrateLabel: "strength-history-full" });
  const days = calendarRange.status === "ready" ? mapWorkoutCalendarDaysForDomain(calendarRange.days, "strength") : [];
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
    return rows;
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
  const { overridesByWorkoutId, reload } = useWorkoutOverrides(workoutIdsForOverrides);

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
    return allRowsAscending.filter((entry) => toYear(entry.day) === selectedYear && toMonthIndex(entry.day) === selectedMonth);
  }, [allRowsAscending, selectedYear, selectedMonth]);

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
      const journalSummary = pickJournalSummaryForStrengthSession(
        selectedWorkoutForMenu.day,
        session,
        manualWorkoutSummaries,
      );
      const surface = buildWorkoutSessionSurfaceModel(
        session,
        overridesByWorkoutId,
        "strength",
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
    [selectedWorkoutForMenu, manualWorkoutSummaries, overridesByWorkoutId, durableTitlesByWorkoutId, closeMenu, router],
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

  useEffect(() => {
    let cancelled = false;
    if (process.env.JEST_WORKER_ID) return;
    if (!user?.uid) {
      setManualWorkoutSummaries([]);
      return;
    }
    void listManualWorkoutDaySummaries(user.uid, () => getIdToken(false)).then((rows) => {
      if (cancelled) return;
      setManualWorkoutSummaries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, getIdToken, refreshEpoch]);

  const confirmDeleteStrengthWorkout = useCallback(async () => {
    if (!pendingDeleteWorkoutId) return;
    const token = await getIdToken(false);
    if (!token) {
      setPendingDeleteWorkoutId(null);
      Alert.alert("Couldn't delete workout", "Sign in again and try once more.");
      return;
    }
    setDeleteWorkoutSubmitting(true);
    const res = await deleteIngestedRawEventAuthed(pendingDeleteWorkoutId, token);
    setDeleteWorkoutSubmitting(false);
    if (res.ok) {
      if (user?.uid) applyAuthoritativeWorkoutDeletionLocal(user.uid, pendingDeleteWorkoutId);
      await clearWorkoutOverride(pendingDeleteWorkoutId);
      await reload();
      setPendingDeleteWorkoutId(null);
      setRefreshEpoch((n) => n + 1);
      return;
    }
    setPendingDeleteWorkoutId(null);
    Alert.alert("Couldn't delete workout", "Something went wrong. Your workouts were not changed.");
  }, [pendingDeleteWorkoutId, getIdToken, user?.uid, reload]);

  const renderRow = useCallback(
    ({ item, index }: { item: HistoryRow; index: number }) => {
      const journalSummary = pickJournalSummaryForStrengthSession(item.day, item.session, manualWorkoutSummaries);
      const surface = buildWorkoutSessionSurfaceModel(
        item.session,
        overridesByWorkoutId,
        "strength",
        journalSummary,
        durableTitlesByWorkoutId,
      );
      const sessionOverride = pickWorkoutOverrideForSession(item.session, overridesByWorkoutId);
      const resolvedMetrics = resolveWorkoutDisplay(
        surface.metricsWorkout,
        sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
      );
      const durationLabel = formatWorkoutDurationLabel(
        resolveWorkoutDisplayDurationMinutes({
          overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
          sessionDurationMinutes: null,
          fallbackWorkoutDurationMinutes: surface.metricsWorkout.durationMinutes ?? item.session.durationMinutes,
        }),
      );
      const metaLine = formatStrengthMetaLine(durationLabel, journalSummary);

      const isLast = index === visibleRows.length - 1;

      return (
        <View style={styles.recentRowWrap}>
          <Pressable
            style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
            onPress={() => {
              router.push({
                pathname: "/(app)/workouts/day/[day]",
                params: { day: item.day },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Open workout details ${surface.actionWorkout.id}`}
          >
            <View style={styles.recentRowTextCol}>
              <Text style={styles.recentDate}>{formatWorkoutDayLabel(item.day)}</Text>
              <Text style={styles.recentTitle} numberOfLines={2} ellipsizeMode="tail">
                {surface.displayTitle}
              </Text>
              <Text style={styles.recentMeta} numberOfLines={1} ellipsizeMode="tail">
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
    [router, manualWorkoutSummaries, overridesByWorkoutId, durableTitlesByWorkoutId, visibleRows.length],
  );

  const monthSectionTitle =
    selectedMonth != null ? (MONTH_FULL[selectedMonth] ?? "") : "";
  const monthWorkoutCount = visibleRows.length;
  const monthWorkoutCountWoLabel = `${monthWorkoutCount} wo`;

  const listSectionHeader =
    selectedMonth != null ? (
      <View
        style={styles.listSectionHeaderRow}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${monthSectionTitle}, ${monthWorkoutCount} ${monthWorkoutCount === 1 ? "workout" : "workouts"}`}
      >
        <Text style={styles.listSectionMonth} importantForAccessibility="no">
          {monthSectionTitle}
        </Text>
        <Text style={styles.listSectionCount} importantForAccessibility="no">
          {monthWorkoutCountWoLabel}
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
        <LoadingState message="Loading strength history…" />
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
                title="No workouts yet"
                description="Start logging your strength sessions to see them here."
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
            router.push({ pathname: "/(app)/workouts/day/[day]", params: { day } });
          }}
          onDoItAgain={() => {
            closeMenu();
            router.push("/(app)/workouts/log");
          }}
          onRename={() => openEditRoute("rename")}
          onEditDuration={() => openEditRoute("duration")}
          onEditType={() => openEditRoute("type")}
          {...(selectedWorkoutForMenu && pickStrengthDeleteTargetWorkout(selectedWorkoutForMenu.session) != null
            ? {
                onDeleteWorkout: () => {
                  const session = selectedMenuSessionRef.current ?? selectedWorkoutForMenu.session;
                  const workout = pickStrengthDeleteTargetWorkout(session);
                  if (!workout) return;
                  const id = (workout.id ?? "").trim();
                  if (!id) return;
                  closeMenu();
                  setPendingDeleteWorkoutId(id);
                },
              }
            : {})}
        />
        <Modal
          visible={pendingDeleteWorkoutId != null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!deleteWorkoutSubmitting) setPendingDeleteWorkoutId(null);
          }}
          presentationStyle="overFullScreen"
        >
          <Pressable
            style={styles.deleteConfirmBackdrop}
            onPress={() => {
              if (!deleteWorkoutSubmitting) setPendingDeleteWorkoutId(null);
            }}
            accessibilityLabel="Close delete workout confirmation"
          >
            <Pressable style={styles.deleteConfirmCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.deleteConfirmTitle}>Delete workout?</Text>
              <Text style={styles.deleteConfirmBody} accessibilityLabel="Delete workout confirmation body">
                This will remove this workout from Oli and update your strength history.
              </Text>
              <View style={styles.deleteConfirmActions}>
                <Pressable
                  onPress={() => {
                    if (!deleteWorkoutSubmitting) setPendingDeleteWorkoutId(null);
                  }}
                  style={styles.deleteConfirmCancelBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel delete workout"
                >
                  <Text style={styles.deleteConfirmCancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void confirmDeleteStrengthWorkout()}
                  disabled={deleteWorkoutSubmitting}
                  style={[styles.deleteConfirmDangerBtn, deleteWorkoutSubmitting && styles.deleteConfirmDangerBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm delete workout"
                >
                  <Text style={styles.deleteConfirmDangerLabel}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
  // Light accent wash: matches Strength calendar ring fill (systemAccent).
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
    /** Breathing room below month row → first workout (~8–10px before first row’s own padding). */
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
    /** Inset within padded list column; stays clear of the trailing ••• control. */
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
  deleteConfirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteConfirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  deleteConfirmTitle: { fontSize: 18, fontWeight: "800", color: "#1C1C1E", marginBottom: 8 },
  deleteConfirmBody: { fontSize: 14, color: "#6E6E73", lineHeight: 20 },
  deleteConfirmActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  deleteConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
  },
  deleteConfirmCancelLabel: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  deleteConfirmDangerBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    alignItems: "center",
  },
  deleteConfirmDangerBtnDisabled: { opacity: 0.55 },
  deleteConfirmDangerLabel: { fontSize: 15, fontWeight: "700", color: "#FF3B30" },
});
