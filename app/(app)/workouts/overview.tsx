/**
 * Workouts Overview — W1 Apple Health integration.
 * Connection status, today metrics (steps, active minutes, active energy, resting HR),
 * recent workouts, last sync, manual "Sync now". Fail-closed: requestId on all API failures.
 *
 * INGESTION: Steps and workouts only (existing kinds). Resting HR, active energy, exercise time:
 * contract kind="incomplete" allows only payload.note (no structured fields); we show them in UI only and do NOT ingest.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform, NativeModules, AppState } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { getGymMenuOptions } from "@/lib/workouts/gymRegistry";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { LoadingState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderIconButton } from "@/lib/ui/HeaderIconButton";
import { WeeklyStrip } from "@/lib/ui/calendar/WeeklyStrip";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay, WorkoutDayMarker } from "@/lib/ui/calendar/types";
import { useWorkoutsCalendarRange } from "@/lib/data/workouts/useWorkoutsCalendar";
import { getRecentWorkoutSessionsFromCalendarDays } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  pullTodaySnapshot,
  pullAnchoredWorkouts,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  type TodaySnapshot,
} from "@/lib/integrations/appleHealth";
import { getWorkoutsAnchor, setWorkoutsAnchor } from "@/lib/integrations/appleHealth/anchor";
import {
  runWorkoutHistoryBackfillPasses,
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
} from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";
import {
  getLastSyncAt,
  setLastSyncAt,
  getAppleHealthLastCheckedAt,
  setAppleHealthLastCheckedAt,
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
  setAppleHealthNotAvailable,
} from "@/lib/integrations/appleHealth/storage";
import { ingestRawEvent } from "@/lib/api/ingest";
import { shouldRun, nowIso } from "@/lib/sync/throttle";
import {
  formatIntegerWithCommas,
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { deriveSessionTypeFlags, reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import type { WorkoutActionAnchor } from "@/lib/ui/WorkoutActionSheet";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import { listManualWorkoutDaySummaries } from "@/lib/workouts/journal/manualWorkoutSummary";

type ConnectionStatus = "loading" | "not_available" | "not_connected" | "connected";

type MaybeIsAvailable = { isAvailable?: unknown };
function getIsAvailableFn(v: unknown): ((cb: (err: unknown, available: boolean) => void) => void) | null {
  if (v == null) return null;
  const cand = (v as MaybeIsAvailable).isAvailable;
  return typeof cand === "function"
    ? (cand as (cb: (err: unknown, available: boolean) => void) => void)
    : null;
}

const ANCHOR_LIMIT = 500;
const APPLE_AUTO_MIN_MS = 2 * 60_000;
const PAGE_BG = "#F2F2F7";
const CARD_BG = "#FFFFFF";
const RADIUS = 12;
const SHELL_TITLE = "Workouts";
const SHELL_SUBTITLE = "Strength & cardio";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatWorkoutDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? "";
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${wd} ${month}/${day}`;
}

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function getTodayBounds(): { start: string; end: string; day: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  const day = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { start: start.toISOString(), end: end.toISOString(), day };
}

function OverflowMenuButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.headerMenuBtn}
      accessibilityRole="button"
      accessibilityLabel="Workouts menu"
    >
      <Text style={styles.headerMenuText}>•••</Text>
    </Pressable>
  );
}

export default function TrainingOverviewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState, setSelectedGymId } = usePreferences();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
  const [selectedWorkoutForMenu, setSelectedWorkoutForMenu] = useState<{
    day: string;
    session: ReconciledWorkoutSession;
  } | null>(null);
  const [workoutMenuAnchor, setWorkoutMenuAnchor] = useState<WorkoutActionAnchor | null>(null);
  const [manualWorkoutNameByDay, setManualWorkoutNameByDay] = useState<Record<string, string>>({});

  const today = getTodayDayKeyLocal();
  const anchorDay = today;
  const [workoutsCalendarRefreshEpoch, setWorkoutsCalendarRefreshEpoch] = useState(0);
  const workoutBackfillInFlightRef = useRef(false);

  const weekDaysFull = getWeekDaysForAnchor(anchorDay);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const recentRangeStart = addCalendarDaysToDayKey(today, -120);
  const recentRangeEnd = today;
  const calendarRangeOptions = useMemo(
    () => ({ refreshEpoch: workoutsCalendarRefreshEpoch }),
    [workoutsCalendarRefreshEpoch],
  );
  const calendarRange = useWorkoutsCalendarRange(weekStart, weekEnd, calendarRangeOptions);
  const recentRange = useWorkoutsCalendarRange(recentRangeStart, recentRangeEnd, calendarRangeOptions);

  const weeklyStripDays: CalendarDay<WorkoutDayMarker>[] =
    calendarRange.status === "ready"
      ? calendarRange.days.map((d) => {
          const markerFlags = deriveSessionTypeFlags(reconcileWorkoutSessionsForDay(d.day, d.workouts));
          return {
            day: d.day,
            meta: {
              hasWorkouts: d.workouts.length > 0,
              hasStrength: markerFlags.hasStrength,
              hasCardio: markerFlags.hasCardio,
              workoutCount: d.workouts.length,
              workouts: d.workouts,
            },
          };
        })
      : weekDaysFull.map((day) => ({
          day,
          meta: {
            hasWorkouts: false,
            hasStrength: false,
            hasCardio: false,
            workoutCount: 0,
            workouts: [],
          },
        }));

  const recentWorkouts = useMemo(() => {
    if (recentRange.status !== "ready") return [];
    return getRecentWorkoutSessionsFromCalendarDays(recentRange.days, 7);
  }, [recentRange]);

  const recentWorkoutIds = useMemo(
    () => recentWorkouts.map((entry) => entry.session.workouts[0]?.id ?? entry.session.id),
    [recentWorkouts],
  );
  const { overridesByWorkoutId, reload } = useWorkoutOverrides(recentWorkoutIds);

  useEffect(() => {
    let cancelled = false;
    if (process.env.JEST_WORKER_ID) return;
    if (!user?.uid) {
      setManualWorkoutNameByDay({});
      return;
    }
    void listManualWorkoutDaySummaries(user.uid).then((rows) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const row of rows) {
        if (row.customName?.trim()) next[row.day] = row.customName.trim();
      }
      setManualWorkoutNameByDay(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

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
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <HeaderIconButton
            iconName="calendar-outline"
            iconSize={24}
            color="#FF3B30"
            accessibilityLabel="Open workouts calendar"
            onPress={() => router.push("/(app)/workouts/calendar")}
          />
          <View style={{ marginRight: -3 }}>
            <OverflowMenuButton onPress={() => setMenuOpen(true)} />
          </View>
        </View>
      ),
      title: SHELL_TITLE,
    });
  }, [navigation, router, setMenuOpen]);

  const loadStored = useCallback(async (skipNotAvailableCheck?: boolean) => {
    const [sync, checked, connected, notAvailable] = await Promise.all([
      getLastSyncAt(),
      getAppleHealthLastCheckedAt(),
      getAppleHealthConnected(),
      getAppleHealthNotAvailable(),
    ]);
    void sync;
    void checked;
    if (!skipNotAvailableCheck && notAvailable) {
      console.log("[AH] status set Not available", { platform: Platform.OS });
      setConnectionStatus("not_available");
      return;
    }
    if (connected) {
      setConnectionStatus("connected");
      return;
    }
    setConnectionStatus("not_connected");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS !== "ios") {
        const mod = await import("react-native-health")
          .then((m) => m.default)
          .catch(() => null);
        if (cancelled) return;
        if (!mod || typeof mod.isAvailable !== "function") {
          console.log("[AH] status set Not available", { platform: Platform.OS });
          await setAppleHealthNotAvailable(true);
          setConnectionStatus("not_available");
          return;
        }
        mod.isAvailable((err: unknown, available: boolean) => {
          if (cancelled) return;
          if (err || !available) {
            console.log("[AH] status set Not available", { platform: Platform.OS });
            setAppleHealthNotAvailable(true).then(() => setConnectionStatus("not_available"));
            return;
          }
          loadStored();
        });
        return;
      }

      // iOS: always run checkAvailability(); do not use stored notAvailable to force Not available
      console.log("[AH] checkAvailability start");
      const nm = NativeModules as Record<string, unknown>;
      const candidate = nm["AppleHealthKit"] ?? null;
      const isAvail = getIsAvailableFn(candidate);
      if (!candidate || !isAvail) {
        setConnectionStatus("not_available");
        return;
      }
      isAvail((err: unknown, available: boolean) => {
        if (cancelled) return;
        if (err || !available) {
          setConnectionStatus("not_available");
          return;
        }
        loadStored(true);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStored]);

  const refetchSnapshot = useCallback(async () => {
    const result = await pullTodaySnapshot();
    if (result.ok) setSnapshot(result.data);
    else setSnapshot(null);
  }, []);

  useEffect(() => {
    if (connectionStatus === "connected") refetchSnapshot();
  }, [connectionStatus, refetchSnapshot]);

  const maybeAutoAppleSync = useCallback(
    async (reason: "focus" | "foreground") => {
      void reason; // reserved for future idempotency / logging
      if (connectionStatus !== "connected" || !user) return;
      const token = await getIdToken(false);
      if (!token) return;

      const last = await getAppleHealthLastCheckedAt().catch(() => null);
      if (!shouldRun(last, APPLE_AUTO_MIN_MS)) return;
      if (workoutBackfillInFlightRef.current) return;
      workoutBackfillInFlightRef.current = true;
      try {
        const result = await runWorkoutHistoryBackfillPasses(
          {
            uid: user.uid,
            token,
            limit: ANCHOR_LIMIT,
            maxPasses: DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
          },
          {
            getWorkoutsAnchor,
            setWorkoutsAnchor,
            pullAnchoredWorkouts,
            pullTodaySnapshot,
            ingestRawEvent,
            getTodayBounds,
            getDeviceTimezone,
            stepsIdempotencyKey,
            workoutIdempotencyKey,
          },
        );

        if (!result.ok) {
          return;
        }

        const atIso = nowIso();
        await setAppleHealthLastCheckedAt(atIso);
        await setLastSyncAt(atIso);
        await refetchSnapshot();
        setWorkoutsCalendarRefreshEpoch((n) => n + 1);
      } finally {
        workoutBackfillInFlightRef.current = false;
      }
    },
    [
      connectionStatus,
      user,
      getIdToken,
      refetchSnapshot,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void maybeAutoAppleSync("focus");
      void reload();
    }, [maybeAutoAppleSync, reload]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void maybeAutoAppleSync("foreground");
    });
    return () => sub.remove();
  }, [maybeAutoAppleSync]);

  const closeWorkoutMenu = useCallback(() => {
    setWorkoutMenuOpen(false);
    setSelectedWorkoutForMenu(null);
    setWorkoutMenuAnchor(null);
  }, []);

  const openEditRoute = useCallback(
    (mode: "rename" | "duration" | "type") => {
      if (!selectedWorkoutForMenu) return;
      const workout = selectedWorkoutForMenu.session.workouts[0];
      if (!workout) return;
      const override = overridesByWorkoutId[workout.id];
      const resolved = resolveWorkoutDisplay(workout, override ?? null);
      closeWorkoutMenu();
      router.push({
        pathname: `/(app)/workouts/edit/${mode}`,
        params: {
          workoutId: workout.id,
          currentTitle: resolved.displayTitle,
          currentDurationMinutes:
            typeof resolved.displayDurationMinutes === "number"
              ? String(Math.round(resolved.displayDurationMinutes))
              : "",
          currentWorkoutType: resolved.displayWorkoutType,
        },
      });
    },
    [selectedWorkoutForMenu, overridesByWorkoutId, closeWorkoutMenu, router],
  );

  const content = (
    <View style={styles.pageBody}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Steps</Text>
          <Text style={styles.metricValue}>{formatIntegerWithCommas(snapshot?.steps)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Exercise time</Text>
          <Text style={styles.metricValue}>
            {formatIntegerWithCommas(snapshot?.exerciseMinutes)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Active energy (kcal)</Text>
          <Text style={styles.metricValue}>
            {formatIntegerWithCommas(snapshot?.activeEnergyKcal)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Resting HR (bpm)</Text>
          <Text style={styles.metricValue}>
            {formatIntegerWithCommas(snapshot?.restingHeartRateBpm)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Recent workouts</Text>
          <Pressable
            onPress={() => router.push("/(app)/workouts/log")}
            accessibilityRole="button"
            accessibilityLabel="Log workout"
            hitSlop={10}
            style={styles.cardHeaderAction}
          >
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          </Pressable>
        </View>
        {recentWorkouts.length === 0 ? (
          <Text style={styles.placeholder}>No workouts yet</Text>
        ) : (
          recentWorkouts.map(({ day, session }) => {
            const representative = session.workouts[0];
            if (!representative) return null;
            const override = overridesByWorkoutId[representative.id];
            const resolved = resolveWorkoutDisplay(representative, override ?? null);
            const durationLabel = formatWorkoutDurationLabel(
              resolveWorkoutDisplayDurationMinutes({
                overrideDurationMinutes: resolved.displayDurationMinutes,
                sessionDurationMinutes: session.durationMinutes,
                fallbackWorkoutDurationMinutes: representative.durationMinutes,
              }),
            );
            return (
              <Pressable
                key={session.id}
                style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                onPress={() => {
                  router.push({
                    pathname: "/(app)/workouts/day/[day]",
                    params: { day },
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open workout details ${representative.id}`}
              >
                <Text style={styles.recentDate}>{formatWorkoutDayLabel(day)}</Text>
                <View style={styles.recentMain}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {representative.sourceId === "manual" && manualWorkoutNameByDay[day]
                      ? manualWorkoutNameByDay[day]
                      : resolved.displayTitle}
                  </Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {durationLabel}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    const native = e?.nativeEvent;
                    setWorkoutMenuAnchor({
                      x: typeof native?.pageX === "number" ? native.pageX : 320,
                      y: typeof native?.pageY === "number" ? native.pageY : 220,
                      width: 24,
                      height: 24,
                    });
                    setSelectedWorkoutForMenu({ day, session });
                    setWorkoutMenuOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Workout actions ${representative.id}`}
                  hitSlop={10}
                  style={styles.rowMenuBtn}
                >
                  <Text style={styles.rowMenuText}>•••</Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </View>

      <WorkoutActionSheet
        visible={workoutMenuOpen && !!selectedWorkoutForMenu}
        anchor={workoutMenuAnchor}
        onClose={closeWorkoutMenu}
        onViewDetails={() => {
          if (!selectedWorkoutForMenu) return;
          const { day } = selectedWorkoutForMenu;
          closeWorkoutMenu();
          router.push({
            pathname: "/(app)/workouts/day/[day]",
            params: { day },
          });
        }}
        onDoItAgain={() => {
          closeWorkoutMenu();
          router.push("/(app)/workouts/log");
        }}
        onRename={() => openEditRoute("rename")}
        onEditDuration={() => openEditRoute("duration")}
        onEditType={() => openEditRoute("type")}
      />
    </View>
  );

  if (initializing) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <EmptyState
          title="Sign in to view workouts"
          description="Sign in to see your Apple Health data and sync workouts."
        />
      </ModuleScreenShell>
    );
  }

  return (
    <ModuleScreenShell
      title={SHELL_TITLE}
      subtitle={SHELL_SUBTITLE}
      hideTitleChrome
      compactHeader
      headerContent={
        <WeeklyStrip
          days={weeklyStripDays}
          selectedDay={today}
          onDayPress={(day) => {
            router.push({
              pathname: "/(app)/workouts/day/[day]",
              params: { day },
            });
          }}
        />
      }
    >
      {content}
      {menuOpen && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuOpen(false)}
          accessibilityLabel="Close menu"
        >
          <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle}>Workouts</Text>
            <Text style={styles.menuSectionLabel}>Gym</Text>
            {getGymMenuOptions().map((opt) => {
              const selected =
                (opt.value === null && prefState.preferences.selectedGymId === null) ||
                (opt.value !== null && prefState.preferences.selectedGymId === opt.value);
              return (
                <Pressable
                  key={opt.value ?? "none"}
                  onPress={() => {
                    setSelectedGymId(opt.value);
                  }}
                  style={[styles.menuOptionRow, selected && styles.menuOptionRowSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Gym: ${opt.label}${selected ? ", selected" : ""}`}
                >
                  <Text style={styles.menuOptionLabel}>{opt.label}</Text>
                  {selected ? <Text style={styles.menuOptionCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 16,
  },
  headerBackButton: {
    marginLeft: 12,
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
  pageBody: {
    backgroundColor: PAGE_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    flexGrow: 1,
    gap: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  placeholder: { fontSize: 15, color: "#8E8E93" },
  primaryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { fontSize: 15, color: "#3C3C43" },
  metricValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  recentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  recentRowPressed: {
    opacity: 0.7,
  },
  recentDate: { width: 84, fontSize: 13, color: "#6E6E73" },
  recentMain: { flex: 1, gap: 2 },
  recentTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  recentMeta: { fontSize: 12, color: "#8E8E93" },
  rowMenuBtn: { paddingHorizontal: 10, paddingVertical: 6, marginTop: -2 },
  rowMenuText: { fontSize: 18, color: "#6E6E73", fontWeight: "700" },
  headerMenuBtn: { padding: 12 },
  headerMenuText: { fontSize: 18, color: "#1C1C1E", fontWeight: "700" },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 24,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  menuTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", textAlign: "center" },
  menuSectionLabel: { fontSize: 13, fontWeight: "600", color: "#6E6E73", marginTop: 4, marginBottom: 6 },
  menuOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  menuOptionRowSelected: { borderColor: "#007AFF", backgroundColor: "rgba(0,122,255,0.08)" },
  menuOptionLabel: { fontSize: 16, fontWeight: "500", color: "#1C1C1E" },
  menuOptionCheck: { fontSize: 16, fontWeight: "700", color: "#007AFF" },
  editorInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1C1C1E",
  },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: "#6E6E73", fontWeight: "600" },
  cancelActionRow: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
  },
  cancelActionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});