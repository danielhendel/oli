/**
 * Recovery Stress analytics — Oura Daily Stress balanced-day coverage (no invented 0–100 score).
 */
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useOuraStressRange } from "@/lib/data/dash/useOuraStressRange";
import {
  computeWeeklyStressBalancedCoverage,
  type WeeklyStressDayInput,
} from "@/lib/data/dash/ouraStressWeekly";
import { deriveOuraImportState } from "@/lib/integrations/oura/importState";
import { RecoveryOuraWeeklyStrip } from "@/lib/ui/recovery/RecoveryOuraWeeklyStrip";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import { networkDayKeysThroughToday } from "@/lib/dates/boundDayKeys";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import type { OuraDailyStressSummary } from "@oli/contracts/ouraVendor";
import { UI_SCREEN_BG, UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

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

export default function StressScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayKeyLocal());
  const todayDayKey = getTodayDayKeyLocal();
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);
  const weekNetworkDayKeys = useMemo(
    () => networkDayKeysThroughToday(weekDayKeys, todayDayKey),
    [weekDayKeys, todayDayKey],
  );
  const networkStart = weekNetworkDayKeys[0] ?? null;
  const networkEnd =
    weekNetworkDayKeys.length > 0
      ? weekNetworkDayKeys[weekNetworkDayKeys.length - 1]!
      : null;

  const stressRange = useOuraStressRange(networkStart, networkEnd, { enabled: true });
  const ouraPresence = useOuraPresence();

  const stripDays: CalendarDay<{ hasOuraSnapshot: boolean }>[] = useMemo(() => {
    const hasByDay: Record<string, boolean> = {};
    if (stressRange.status === "ready" || stressRange.status === "error") {
      for (const d of stressRange.days) {
        if (d.daySummary != null) hasByDay[d.day] = true;
      }
    }
    return weekDayKeys.map((day) => ({
      day,
      meta: { hasOuraSnapshot: hasByDay[day] === true },
    }));
  }, [weekDayKeys, stressRange]);

  const headerStrip = (
    <RecoveryOuraWeeklyStrip
      days={stripDays}
      selectedDay={selectedDay}
      onDayPress={setSelectedDay}
      categoryLabel="stress"
      testIDPrefix="stress-weekly"
    />
  );

  useFocusEffect(
    useCallback(() => {
      stressRange.refetch({ cacheBust: `stress:${Date.now()}` });
    }, [stressRange.refetch]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Stress",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation, router]);

  const coverage = useMemo(() => {
    const days: WeeklyStressDayInput[] = [];
    if (stressRange.status === "ready" || stressRange.status === "error") {
      for (const d of stressRange.days) {
        if (d.daySummary == null) continue;
        if (!weekNetworkDayKeys.includes(d.day as (typeof weekNetworkDayKeys)[number])) continue;
        days.push({ day: d.day, daySummary: d.daySummary as OuraDailyStressSummary });
      }
    }
    return computeWeeklyStressBalancedCoverage({ days });
  }, [stressRange, weekNetworkDayKeys]);

  const selectedSummary = useMemo(() => {
    if (stressRange.status !== "ready" && stressRange.status !== "error") return null;
    const hit = stressRange.days.find((d) => d.day === selectedDay);
    return hit?.daySummary ?? null;
  }, [stressRange, selectedDay]);

  if (stressRange.status === "partial" || ouraPresence.status === "partial") {
    return (
      <RecoveryShell title="Stress" headerContent={headerStrip}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading stress data…</Text>
        </View>
      </RecoveryShell>
    );
  }

  const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
  const importState = ouraConnected
    ? deriveOuraImportState({
        connected: ouraPresence.data.connected,
        lastSnapshotAt: ouraPresence.data.lastSnapshotAt,
        backfillStatus: ouraPresence.data.backfillStatus,
      })
    : null;

  if (!ouraConnected) {
    return (
      <RecoveryShell title="Stress" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>Connect Oura</Text>
          <Text style={styles.emptySubtitle}>
            Connect Oura in Settings → Devices to see daily stress summaries for this week.
          </Text>
        </View>
      </RecoveryShell>
    );
  }

  if (importState === "failed") {
    return (
      <RecoveryShell title="Stress" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>Reconnect Oura</Text>
          <Text style={styles.emptySubtitle}>
            Oura import failed. Reconnect in Settings → Devices and try again.
          </Text>
        </View>
      </RecoveryShell>
    );
  }

  if (stressRange.status === "error") {
    return (
      <RecoveryShell title="Stress" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>Could not load stress data. Try again later.</Text>
        </View>
      </RecoveryShell>
    );
  }

  if (coverage.eligibleStressDayCount === 0) {
    return (
      <RecoveryShell title="Stress" headerContent={headerStrip}>
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No stress data this week</Text>
          <Text style={styles.emptySubtitle}>
            Oura is connected, but there are no exact daily stress summaries for the selected week yet.
          </Text>
        </View>
      </RecoveryShell>
    );
  }

  return (
    <RecoveryShell title="Stress" headerContent={headerStrip}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This week</Text>
        <Text style={styles.primaryValue} testID="stress-week-balanced">
          {coverage.displayValue}
        </Text>
        <Text style={styles.support}>
          {coverage.balancedDayCount} balanced · {coverage.stressfulDayCount} stressful ·{" "}
          {coverage.eligibleStressDayCount} eligible days
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Selected day</Text>
        <Text style={styles.primaryValue} testID="stress-day-summary">
          {selectedSummary == null
            ? "No data"
            : selectedSummary.charAt(0).toUpperCase() + selectedSummary.slice(1)}
        </Text>
        <Text style={styles.support}>
          Oura day summary only — no invented 0–100 stress score.
        </Text>
      </View>
    </RecoveryShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: UI_SCREEN_BG,
    gap: 12,
  },
  loadingText: { fontSize: 15, color: UI_TEXT_MUTED },
  messageCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(120,120,128,0.12)",
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY },
  emptySubtitle: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  errorText: { fontSize: 14, color: "#FF6E6E", lineHeight: 20 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(120,120,128,0.12)",
    gap: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: UI_TEXT_SECONDARY },
  primaryValue: {
    fontSize: 22,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  support: { fontSize: 13, lineHeight: 18, color: UI_TEXT_MUTED },
});
