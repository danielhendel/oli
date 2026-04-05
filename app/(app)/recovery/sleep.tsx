import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useSleepView } from "@/lib/data/useSleepView";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useOuraViewWeekSnapshotPresence } from "@/lib/data/oura/useOuraViewWeekSnapshotPresence";
import { deriveOuraImportState } from "@/lib/integrations/oura/importState";
import { RecoveryScoreCard } from "@/lib/ui/recovery/RecoveryScoreCard";
import {
  RecoveryContributorsCard,
  type ContributorRowProps,
} from "@/lib/ui/recovery/RecoveryContributorsCard";
import { RecoveryOuraWeeklyStrip } from "@/lib/ui/recovery/RecoveryOuraWeeklyStrip";
import {
  scoreToRatingLabel,
  contributorValueToProgress,
  contributorValueToRatingLabel,
  formatContributorDisplayValue,
  formatSleepDurationMinutes,
  SLEEP_CONTRIBUTOR_KEYS,
} from "@/lib/format/ouraScore";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";

/** Format YYYY-MM-DD as "Mar 13" for fallback banner. */
function formatResolvedDay(day: string): string {
  try {
    const d = new Date(day + "T12:00:00.000Z");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const date = d.getUTCDate();
    return `${month} ${date}`;
  } catch {
    return day;
  }
}

function RecoveryShell({
  title,
  headerContent,
  children,
}: {
  title: string;
  headerContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ModuleScreenShell title={title} hideTitleChrome compactHeader headerContent={headerContent}>
      {children}
    </ModuleScreenShell>
  );
}

export default function SleepScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayKeyLocal());
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);
  const weekStripPresence = useOuraViewWeekSnapshotPresence(weekDayKeys, "sleep");
  const refetchWeekStrip = weekStripPresence.refetch;
  const { refetch: refetchSleep, ...sleepState } = useSleepView(selectedDay);
  const ouraPresence = useOuraPresence();

  const stripDays: CalendarDay<{ hasOuraSnapshot: boolean }>[] = useMemo(() => {
    const map =
      weekStripPresence.status === "ready" ? weekStripPresence.hasSnapshotByDay : {};
    return weekDayKeys.map((day) => ({
      day,
      meta: { hasOuraSnapshot: map[day] === true },
    }));
  }, [weekDayKeys, weekStripPresence]);

  const headerStrip = (
    <RecoveryOuraWeeklyStrip
      days={stripDays}
      selectedDay={selectedDay}
      onDayPress={setSelectedDay}
      categoryLabel="sleep"
      testIDPrefix="sleep-weekly"
    />
  );

  useFocusEffect(
    useCallback(() => {
      const bust = Date.now();
      void refetchSleep({ cacheBust: `sleep:${bust}` });
      void refetchWeekStrip();
    }, [refetchSleep, refetchWeekStrip]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Sleep",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          calendarAccessibilityLabel="Open sleep calendar"
          onCalendarPress={() => router.push("/(app)/recovery/sleep/calendar")}
          overflowAccessibilityLabel="Sleep settings"
          onOverflowPress={() => router.push("/(app)/recovery/sleep/settings")}
        />
      ),
    });
  }, [navigation, router]);

  if (sleepState.status === "partial") {
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading sleep data…</Text>
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status === "missing") {
    const ouraConnected =
      ouraPresence.status === "ready" && ouraPresence.data.connected;
    const importState = ouraConnected
      ? deriveOuraImportState({
          connected: ouraPresence.data.connected,
          lastSnapshotAt: ouraPresence.data.lastSnapshotAt,
          backfillStatus: ouraPresence.data.backfillStatus,
        })
      : null;
    let subtitle2: string;
    if (importState === "running") {
      subtitle2 = "Oura history is importing. Data should appear when import completes.";
    } else if (importState === "failed") {
      subtitle2 = "Oura import failed. Pull to refresh and try again.";
    } else if (importState === "connected_no_data" || importState === "ready") {
      subtitle2 =
        "Oura is connected, but there is no sleep snapshot stored for this day yet.";
    } else {
      subtitle2 =
        "Connect Oura in Settings → Devices and sync to see your sleep score and contributors here.";
    }
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No Oura sleep for {formatResolvedDay(selectedDay)}</Text>
          <Text style={styles.emptySubtitle}>{subtitle2}</Text>
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status === "error") {
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>Could not load sleep data. Try again later.</Text>
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status !== "ready") {
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.emptySubtitle}>No sleep data available.</Text>
        </View>
      </RecoveryShell>
    );
  }

  const view = sleepState.data;
  const score = view.score ?? null;
  const contributors =
    view.contributors && typeof view.contributors === "object"
      ? (view.contributors as Record<string, unknown>)
      : {};

  const contributorRows: ContributorRowProps[] = SLEEP_CONTRIBUTOR_KEYS.map(({ key, label }) => {
    const value = contributors[key];
    const displayValue =
      key === "total_sleep" && view.totalMinutes != null
        ? formatSleepDurationMinutes(view.totalMinutes)
        : formatContributorDisplayValue(key, value);
    const progress = contributorValueToProgress(value);
    const rating = contributorValueToRatingLabel(value);
    return { label, valueDisplay: displayValue, progress, rating };
  });

  const fallbackMessage = view.isFallback
    ? `Showing latest available Oura sleep for ${formatResolvedDay(view.resolvedDay)}`
    : null;

  return (
    <RecoveryShell title="Sleep" headerContent={headerStrip}>
      <View style={styles.content}>
        <RecoveryScoreCard
          score={score}
          ratingLabel={score != null ? scoreToRatingLabel(score) : null}
          fallbackMessage={fallbackMessage}
        />
        <RecoveryContributorsCard rows={contributorRows} />
        {score == null && Object.keys(contributors).length === 0 && (
          <View style={styles.messageCard}>
            <Text style={styles.emptySubtitle}>No detailed metrics for this day.</Text>
          </View>
        )}
      </View>
    </RecoveryShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: "#F2F2F7",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
    backgroundColor: "#F2F2F7",
  },
  loadingText: { fontSize: 16, color: "#6E6E73" },
  messageCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: "#6E6E73", lineHeight: 22 },
  errorText: { fontSize: 15, color: "#6E6E73" },
});
