import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  type RefreshControlProps,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import {
  WORKOUTS_HEADER_TITLE_COLOR,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useSleepDayView } from "@/lib/data/useSleepDayView";
import { useSleepPullToRefresh } from "@/lib/data/useSleepPullToRefresh";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useSleepWeekDataPresence } from "@/lib/data/useSleepWeekDataPresence";
import { deriveOuraImportState } from "@/lib/integrations/oura/importState";
import { RecoveryScoreCard } from "@/lib/ui/recovery/RecoveryScoreCard";
import {
  RecoveryContributorsCard,
  type ContributorRowProps,
} from "@/lib/ui/recovery/RecoveryContributorsCard";
import { RecoveryOuraWeeklyStrip } from "@/lib/ui/recovery/RecoveryOuraWeeklyStrip";
import { SleepOliMetricsCard } from "@/lib/ui/recovery/SleepOliMetricsCard";
import { SleepInsightsCard } from "@/lib/ui/recovery/SleepInsightsCard";
import {
  contributorValueToProgress,
  contributorValueToRatingLabel,
  formatContributorDisplayValue,
  formatSleepDurationMinutes,
  SLEEP_CONTRIBUTOR_KEYS,
} from "@/lib/format/ouraScore";
import { pickLatestSleepWeekDayWithPresence } from "@/lib/data/sleep/pickLatestSleepWeekDayWithPresence";
import { sleepOuraContributorsCardShouldRender } from "@/lib/ui/recovery/sleepOuraContributorsVisibility";
import {
  buildSleepHeadlineScoreCardModelForOliPath,
  buildSleepHeadlineScoreCardModelForOuraFallbackPath,
} from "@/lib/data/sleep/sleepHeadlineScoreCardModel";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";

import { UI_CARD_SURFACE, UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
function parseDayRouteParam(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

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
  refreshControl,
  children,
}: {
  title: string;
  headerContent: React.ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  children: React.ReactNode;
}) {
  return (
    <ModuleScreenShell
      title={title}
      hideTitleChrome
      compactHeader
      headerContent={headerContent}
      {...(refreshControl ? { refreshControl } : {})}
    >
      {children}
    </ModuleScreenShell>
  );
}

export default function SleepScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayFromRoute = parseDayRouteParam(params.day);
  const [selectedDay, setSelectedDay] = useState(() => dayFromRoute ?? getTodayDayKeyLocal());
  /** True after calendar route param or explicit strip tap — blocks auto “snap to latest” week day. */
  const userPinnedSelectedDayRef = useRef(dayFromRoute != null);

  useEffect(() => {
    const d = parseDayRouteParam(params.day);
    if (d != null) {
      userPinnedSelectedDayRef.current = true;
      setSelectedDay(d);
    }
  }, [params.day]);

  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);
  const weekStripPresence = useSleepWeekDataPresence(weekDayKeys);
  const refetchWeekStrip = weekStripPresence.refetch;
  const { refetch: refetchSleep, ...sleepState } = useSleepDayView(selectedDay);
  const ouraPresence = useOuraPresence();

  const oliHeadlineScoreModel = useMemo(() => {
    if (sleepState.status !== "oli") return null;
    const vendorRaw = sleepState.vendorSleepView?.score;
    const vendorScore =
      typeof vendorRaw === "number" && Number.isFinite(vendorRaw) ? vendorRaw : null;
    return buildSleepHeadlineScoreCardModelForOliPath(vendorScore);
  }, [sleepState]);

  const ouraFallbackHeadlineScoreModel = useMemo(() => {
    if (sleepState.status !== "oura_fallback") return null;
    const raw = sleepState.data.score ?? null;
    const ouraScore = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    return buildSleepHeadlineScoreCardModelForOuraFallbackPath(ouraScore);
  }, [sleepState]);

  const weekPresenceFingerprint = useMemo(() => {
    if (weekStripPresence.status !== "ready") return "";
    return weekDayKeys.map((k) => `${k}:${weekStripPresence.hasSleepDataByDay[k] === true ? 1 : 0}`).join("|");
  }, [weekDayKeys, weekStripPresence]);

  useEffect(() => {
    if (userPinnedSelectedDayRef.current) return;
    if (weekStripPresence.status !== "ready" || weekPresenceFingerprint.length === 0) return;
    const map = weekStripPresence.hasSleepDataByDay;
    if (map[selectedDay] === true) return;
    const pivot = pickLatestSleepWeekDayWithPresence(weekDayKeys, map);
    if (pivot != null && pivot !== selectedDay) {
      setSelectedDay(pivot);
    }
  }, [weekPresenceFingerprint, weekStripPresence, selectedDay, weekDayKeys]);

  const onStripDayPress = useCallback((day: string) => {
    userPinnedSelectedDayRef.current = true;
    setSelectedDay(day);
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const { pullToRefreshSleep } = useSleepPullToRefresh({
    selectedDay,
    refetchSleep,
    refetchWeekStrip,
  });

  const onSleepRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await pullToRefreshSleep();
    } finally {
      setRefreshing(false);
    }
  }, [pullToRefreshSleep]);

  const sleepRefreshControl = useMemo(
    () => (
      <RefreshControl refreshing={refreshing} onRefresh={onSleepRefresh} tintColor="#8E8E93" />
    ),
    [refreshing, onSleepRefresh],
  );

  const stripDays: CalendarDay<{ hasOuraSnapshot: boolean }>[] = useMemo(() => {
    const map =
      weekStripPresence.status === "ready" ? weekStripPresence.hasSleepDataByDay : {};
    return weekDayKeys.map((day) => ({
      day,
      meta: { hasOuraSnapshot: map[day] === true },
    }));
  }, [weekDayKeys, weekStripPresence]);

  const headerStrip = (
    <RecoveryOuraWeeklyStrip
      days={stripDays}
      selectedDay={selectedDay}
      onDayPress={onStripDayPress}
      categoryLabel="sleep"
      stripVariant="sleep"
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
      headerTitleStyle: {
        fontSize: 21,
        fontWeight: "600",
        color: WORKOUTS_HEADER_TITLE_COLOR,
      },
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
      <RecoveryShell title="Sleep" headerContent={headerStrip} refreshControl={sleepRefreshControl}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading sleep data…</Text>
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status === "missing") {
    const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
    const importState = ouraConnected
      ? deriveOuraImportState({
          connected: ouraPresence.data.connected,
          lastSnapshotAt: ouraPresence.data.lastSnapshotAt,
          backfillStatus: ouraPresence.data.backfillStatus,
        })
      : null;
    let subtitle2: string;
    if (importState === "running") {
      subtitle2 =
        "Sleep history is importing. Pipeline rollups appear after sync and processing complete.";
    } else if (importState === "failed") {
      subtitle2 = "Device sync failed. Pull to refresh or reconnect in Settings → Devices.";
    } else if (importState === "connected_no_data" || importState === "ready") {
      subtitle2 =
        "Device is connected; no sleep rollup or vendor snapshot for this day yet. Try syncing.";
    } else {
      subtitle2 =
        "Connect a sleep-capable source in Settings → Devices and sync to populate sleep.";
    }
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip} refreshControl={sleepRefreshControl}>
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No sleep data for {formatResolvedDay(selectedDay)}</Text>
          <Text style={styles.emptySubtitle}>{subtitle2}</Text>
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status === "error") {
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip} refreshControl={sleepRefreshControl}>
        <View style={styles.messageCard}>
          <Text style={styles.errorTitle}>Couldn&apos;t load sleep data</Text>
          <Text style={styles.errorSubtitle}>
            Check your connection. Pull down to refresh or try again below.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading sleep data"
            onPress={() => void pullToRefreshSleep()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status === "oli") {
    const headlineModel = oliHeadlineScoreModel!;

    const sleepInsightItems =
      sleepState.insights?.items.filter((i) => i.tags?.includes("sleep")) ?? [];

    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip} refreshControl={sleepRefreshControl}>
        <View style={styles.content}>
          <RecoveryScoreCard
            title={headlineModel.title}
            score={headlineModel.score}
            ratingLabel={headlineModel.ratingLabel}
            fallbackMessage={null}
            scoreFootnote={headlineModel.scoreFootnote}
            scoreUnavailableSubtitle={headlineModel.scoreUnavailableSubtitle}
          />
          <SleepOliMetricsCard sleep={sleepState.sleep} />
          <SleepInsightsCard items={sleepInsightItems} />
        </View>
      </RecoveryShell>
    );
  }

  if (sleepState.status !== "oura_fallback") {
    return (
      <RecoveryShell title="Sleep" headerContent={headerStrip} refreshControl={sleepRefreshControl}>
        <View style={styles.messageCard}>
          <Text style={styles.emptySubtitle}>No sleep data available.</Text>
        </View>
      </RecoveryShell>
    );
  }

  const view = sleepState.data;
  const score = view.score ?? null;
  const headlineOuraModel = ouraFallbackHeadlineScoreModel!;

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

  const showContributorsCard = sleepOuraContributorsCardShouldRender(view, contributorRows);
  const showOuraEmptyDetails =
    !showContributorsCard && score == null && Object.keys(contributors).length === 0;

  return (
    <RecoveryShell title="Sleep" headerContent={headerStrip} refreshControl={sleepRefreshControl}>
      <View style={styles.content}>
        <RecoveryScoreCard
          title={headlineOuraModel.title}
          score={headlineOuraModel.score}
          ratingLabel={headlineOuraModel.ratingLabel}
          fallbackMessage={fallbackMessage}
          scoreFootnote={headlineOuraModel.scoreFootnote}
          scoreUnavailableSubtitle={headlineOuraModel.scoreUnavailableSubtitle}
        />
        {showContributorsCard ? <RecoveryContributorsCard rows={contributorRows} /> : null}
        {showOuraEmptyDetails ? (
          <View style={styles.messageCard}>
            <Text style={styles.emptySubtitle}>No detailed sleep metrics for this day.</Text>
          </View>
        ) : null}
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
    backgroundColor: UI_SCREEN_BG,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
    backgroundColor: UI_SCREEN_BG,
  },
  loadingText: { fontSize: 16, color: "#6E6E73" },
  messageCard: {
    backgroundColor: UI_SCREEN_BG,
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: "#6E6E73", lineHeight: 22 },
  errorTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E", marginBottom: 8 },
  errorSubtitle: { fontSize: 15, color: "#6E6E73", lineHeight: 22 },
  retryButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: UI_CARD_SURFACE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
  },
  retryButtonPressed: { opacity: 0.85 },
  retryLabel: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
});
