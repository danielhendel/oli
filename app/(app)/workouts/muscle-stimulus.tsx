/**
 * Weekly Muscle Stimulus drill-down — Strength overview card destination.
 */

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { buildWeeklyHypertrophyStimulusDetailFromJournal } from "@/lib/data/workouts/weeklyHypertrophyStimulusDetailModel";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import {
  listManualWorkoutDaySummaries,
  type ManualWorkoutDaySummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LoadingState } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekStartSunday } from "@/lib/ui/calendar/dateUtils";
import { formatWeekDayKeyRange } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";
import { WeeklyHypertrophyStimulusDetailContent } from "@/lib/ui/workouts/WeeklyHypertrophyStimulusDetailContent";

export const WEEKLY_MUSCLE_STIMULUS_PATH = "/(app)/workouts/muscle-stimulus" as const;

export type WeeklyMuscleStimulusRouteParams = {
  weekStart?: string;
};

function parseWeekStartParam(value: string | string[] | undefined): DayKey | null {
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (raw == null) return null;
  const trimmed = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? (trimmed as DayKey) : null;
}

export default function WeeklyMuscleStimulusScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<WeeklyMuscleStimulusRouteParams>();
  const { user, getIdToken } = useAuth();
  const [manualSummaries, setManualSummaries] = useState<ManualWorkoutDaySummary[]>([]);
  const [customExerciseById, setCustomExerciseById] = useState<ReadonlyMap<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  const weekStartDay = useMemo(() => {
    const parsed = parseWeekStartParam(params.weekStart);
    if (parsed != null) return getWeekStartSunday(parsed);
    return getWeekStartSunday(getTodayDayKeyLocal());
  }, [params.weekStart]);

  const weekRangeLabel = useMemo(() => {
    const weekEnd = addCalendarDaysToDayKey(weekStartDay, 6);
    return formatWeekDayKeyRange(weekStartDay, weekEnd);
  }, [weekStartDay]);

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Muscle Stimulus",
    });
  }, [navigation]);

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) {
      setLoading(false);
      return;
    }
    if (!user?.uid) {
      setManualSummaries([]);
      setCustomExerciseById(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void Promise.all([
      listManualWorkoutDaySummaries(user.uid, () => getIdToken(false)),
      listMergedCustomExerciseRecords(user.uid, () => getIdToken(false)).catch(() => []),
    ])
      .then(([summaries, customRows]) => {
        if (cancelled) return;
        setManualSummaries(summaries);
        setCustomExerciseById(new Map(customRows.map((row) => [row.exerciseId, row.name])));
      })
      .catch(() => {
        if (cancelled) return;
        setManualSummaries([]);
        setCustomExerciseById(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, getIdToken]);

  const detail = useMemo(
    () =>
      buildWeeklyHypertrophyStimulusDetailFromJournal({
        summaries: manualSummaries,
        weekStartDay,
        customExerciseNameById: customExerciseById,
      }),
    [manualSummaries, weekStartDay, customExerciseById],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID="weekly-muscle-stimulus-scroll"
    >
      {loading ? <LoadingState variant="inline" message="Loading muscle stimulus…" /> : null}
      {!loading ? (
        <WeeklyHypertrophyStimulusDetailContent
          detail={detail}
          weekRangeLabel={weekRangeLabel}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
});
