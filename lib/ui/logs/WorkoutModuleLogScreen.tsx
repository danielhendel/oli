import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { useAuth } from "@/lib/auth/AuthProvider";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import {
  applyAuthoritativeWorkoutDeletionLocal,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { clearWorkoutOverride, useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import {
  buildWorkoutSessionSurfaceModel,
  pickJournalSummaryForStrengthSession,
  pickStrengthDeleteTargetWorkout,
  pickWorkoutForSessionActions,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import { buildWorkoutLogRows, type WorkoutLogRow } from "@/lib/data/workouts/workoutLogRows";
import { resolveWorkoutDisplay } from "@/lib/data/workouts/workoutDisplay";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { MetricLogRow } from "@/lib/ui/logs/MetricLogRow";
import type { MetricLogRowMenuAnchor } from "@/lib/ui/logs/MetricLogRowMenu";
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { listManualWorkoutDaySummaries, type ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

export type WorkoutModuleLogScreenProps = {
  domain: "strength" | "cardio";
  title: string;
  testId: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function WorkoutModuleLogScreen({
  domain,
  title,
  testId,
  emptyTitle,
  emptyDescription,
}: WorkoutModuleLogScreenProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const today = getTodayDayKeyLocal();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MetricLogRowMenuAnchor | null>(null);
  const [selectedRow, setSelectedRow] = useState<WorkoutLogRow | null>(null);
  const [pendingDeleteWorkoutId, setPendingDeleteWorkoutId] = useState<string | null>(null);
  const [deleteWorkoutSubmitting, setDeleteWorkoutSubmitting] = useState(false);
  const [manualWorkoutSummaries, setManualWorkoutSummaries] = useState<ManualWorkoutDaySummary[]>([]);

  const { start, end } = useMemo(() => computeWorkoutOverviewSharedCalendarRange(today), [today]);
  const calendarRange = useWorkoutsCalendarRange(start, end, {
    refreshEpoch,
    debugHydrateLabel: `${domain}-module-log`,
  });
  const days =
    calendarRange.status === "ready" ? mapWorkoutCalendarDaysForDomain(calendarRange.days, domain) : [];
  const durableTitlesByWorkoutId =
    calendarRange.status === "ready" ? calendarRange.durableTitlesByWorkoutId : {};

  const workoutIdsForOverrides = useMemo(() => {
    const ids: string[] = [];
    for (const d of days) {
      for (const w of d.workouts) ids.push(w.id);
    }
    return ids;
  }, [days]);
  const { overridesByWorkoutId, reload } = useWorkoutOverrides(workoutIdsForOverrides);

  const rows = useMemo(
    () =>
      buildWorkoutLogRows({
        days,
        domain,
        overridesByWorkoutId,
        durableTitlesByWorkoutId,
        manualWorkoutSummaries: domain === "strength" ? manualWorkoutSummaries : [],
      }),
    [days, domain, overridesByWorkoutId, durableTitlesByWorkoutId, manualWorkoutSummaries],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
      title,
    });
  }, [navigation, title]);

  useEffect(() => {
    let cancelled = false;
    if (process.env.JEST_WORKER_ID) return;
    if (domain !== "strength" || !user?.uid) {
      setManualWorkoutSummaries([]);
      return;
    }
    void listManualWorkoutDaySummaries(user.uid, () => getIdToken(false)).then((loaded) => {
      if (!cancelled) setManualWorkoutSummaries(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [domain, user?.uid, getIdToken, refreshEpoch]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuAnchor(null);
    setSelectedRow(null);
  }, []);

  const selectedMenuSessionRef = useRef<ReconciledWorkoutSession | null>(null);
  selectedMenuSessionRef.current = selectedRow?.session ?? null;

  const openEditRoute = useCallback(
    (mode: "rename" | "duration" | "type") => {
      if (!selectedRow) return;
      const session = selectedMenuSessionRef.current ?? selectedRow.session;
      const workout = pickWorkoutForSessionActions(session);
      if (!workout) return;
      const journalSummary =
        domain === "strength"
          ? pickJournalSummaryForStrengthSession(selectedRow.day, session, manualWorkoutSummaries)
          : null;
      const surface = buildWorkoutSessionSurfaceModel(
        session,
        overridesByWorkoutId,
        domain,
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
    [
      selectedRow,
      domain,
      manualWorkoutSummaries,
      overridesByWorkoutId,
      durableTitlesByWorkoutId,
      closeMenu,
      router,
    ],
  );

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

  const dayDetailPath =
    domain === "strength" ? "/(app)/workouts/day/[day]" : "/(app)/cardio/day/[day]";
  const logAgainPath = domain === "strength" ? "/(app)/workouts/log" : "/(app)/cardio/log";

  if (calendarRange.status === "partial") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <LoadingState message={`Loading ${title.toLowerCase()}…`} />
      </ScreenContainer>
    );
  }

  if (calendarRange.status === "error") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <ErrorState message={calendarRange.error} requestId={calendarRange.requestId} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={["left", "right", "bottom"]}>
      <View style={styles.body} testID={testId}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MetricLogRow
              testID={`${testId}-row-${item.key}`}
              dateLabel={item.dateLabel}
              primaryMetric={item.primaryMetric}
              secondaryMetric={item.secondaryMetric}
              accessibilityLabel={item.accessibilityLabel}
              onPress={() => {
                router.push({ pathname: dayDetailPath, params: { day: item.day } });
              }}
              onOpenMenu={(anchor) => {
                setSelectedRow(item);
                setMenuAnchor(anchor);
                setMenuOpen(true);
              }}
            />
          )}
          ListEmptyComponent={<EmptyState title={emptyTitle} description={emptyDescription} />}
        />
        <WorkoutActionSheet
          visible={menuOpen && selectedRow != null}
          anchor={menuAnchor}
          onClose={closeMenu}
          onViewDetails={() => {
            if (!selectedRow) return;
            const day = selectedRow.day;
            closeMenu();
            router.push({ pathname: dayDetailPath, params: { day } });
          }}
          onDoItAgain={() => {
            closeMenu();
            router.push(logAgainPath);
          }}
          onRename={() => openEditRoute("rename")}
          onEditDuration={() => openEditRoute("duration")}
          onEditType={() => openEditRoute("type")}
          {...(domain === "strength" &&
          selectedRow &&
          pickStrengthDeleteTargetWorkout(selectedRow.session) != null
            ? {
                onDeleteWorkout: () => {
                  const session = selectedMenuSessionRef.current ?? selectedRow.session;
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
        {domain === "strength" ? (
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
                <Text style={styles.deleteConfirmBody}>
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
                    style={[
                      styles.deleteConfirmDangerBtn,
                      deleteWorkoutSubmitting && styles.deleteConfirmDangerBtnDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm delete workout"
                  >
                    <Text style={styles.deleteConfirmDangerLabel}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
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
  deleteConfirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteConfirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 16,
    padding: 20,
  },
  deleteConfirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    marginBottom: 8,
  },
  deleteConfirmBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginBottom: 20,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  deleteConfirmCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  deleteConfirmCancelLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  deleteConfirmDangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
  },
  deleteConfirmDangerBtnDisabled: {
    opacity: 0.5,
  },
  deleteConfirmDangerLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
