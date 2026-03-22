/**
 * Workouts History — list of past workouts from raw events (workout kind).
 * Uses useWorkoutsHistory; fail-closed with requestId on API errors.
 */

import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { WorkoutsHeaderRightRow } from "@/lib/ui/headers/WorkoutsHeaderRightRow";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ErrorState, LoadingState, EmptyState } from "@/lib/ui/ScreenStates";
import { useWorkoutsHistory } from "@/lib/data/useWorkoutsHistory";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { getAppleHealthConnected, getAppleHealthNotAvailable } from "@/lib/integrations/appleHealth/storage";

const SHELL_TITLE = "Workouts";
const SHELL_SUBTITLE = "Strength & cardio";

/** Placeholder until menu actions are defined. */
// eslint-disable-next-line @typescript-eslint/no-empty-function
function menuPlaceholder() {}

type AppleHealthStatus = "loading" | "not_available" | "not_connected" | "connected";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
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

function StatusChip({
  status,
  onPress,
}: {
  status: "Connected" | "Not connected" | "Not available";
  onPress?: () => void;
}) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      {...(onPress ? { onPress, accessibilityRole: "button" as const, accessibilityLabel: `Apple Health ${status}` } : {})}
      style={styles.chip}
    >
      <Text style={styles.chipTitle}>Apple Health</Text>
      <Text style={styles.chipStatus}>{status}</Text>
    </Comp>
  );
}

function WorkoutRow({ item }: { item: WorkoutHistoryItem }) {
  const time = formatDateTime(item.start ?? item.observedAt);
  const duration = item.durationMinutes != null ? `${item.durationMinutes} min` : null;
  const calories = item.calories != null ? `${item.calories} kcal` : null;
  const sourceLabel = item.hk?.sourceId ?? item.sourceId;

  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.rowTime}>{time}</Text>
      <View style={styles.rowMeta}>
        {duration ? <Text style={styles.rowMetaText}>{duration}</Text> : null}
        {calories ? <Text style={styles.rowMetaText}>{calories}</Text> : null}
        <Text style={styles.rowSource} numberOfLines={1}>
          {sourceLabel}
        </Text>
      </View>
    </View>
  );
}

export default function WorkoutHistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [appleHealthStatus, setAppleHealthStatus] = useState<AppleHealthStatus>("loading");
  const history = useWorkoutsHistory();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <WorkoutsHeaderRightRow>
          <OverflowMenuButton onPress={menuPlaceholder} />
        </WorkoutsHeaderRightRow>
      ),
      title: SHELL_TITLE,
    });
  }, [navigation]);

  const loadStored = useCallback(async () => {
    const [connected, notAvailable] = await Promise.all([
      getAppleHealthConnected(),
      getAppleHealthNotAvailable(),
    ]);
    if (notAvailable) {
      setAppleHealthStatus("not_available");
      return;
    }
    setAppleHealthStatus(connected ? "connected" : "not_connected");
  }, []);

  useEffect(() => {
    void loadStored();
  }, [loadStored]);

  const chipStatus: "Connected" | "Not connected" | "Not available" =
    appleHealthStatus === "connected"
      ? "Connected"
      : appleHealthStatus === "not_available"
        ? "Not available"
        : "Not connected";

  const goToOverview = useCallback(() => {
    router.push("/(app)/workouts");
  }, [router]);

  if (initializing || !user) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <EmptyState title="Sign in to view workouts" />
      </ModuleScreenShell>
    );
  }

  if (history.status === "idle" || history.status === "partial") {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>WORKOUT HISTORY</Text>
          <StatusChip status={chipStatus} />
        </View>
        {appleHealthStatus === "not_connected" && (
          <Pressable onPress={goToOverview} style={styles.overviewBtn} accessibilityRole="button">
            <Text style={styles.overviewBtnText}>Go to Training Overview</Text>
          </Pressable>
        )}
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (history.status === "error") {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>WORKOUT HISTORY</Text>
          <StatusChip status={chipStatus} />
        </View>
        {appleHealthStatus === "not_connected" && (
          <Pressable onPress={goToOverview} style={styles.overviewBtn} accessibilityRole="button">
            <Text style={styles.overviewBtnText}>Go to Training Overview</Text>
          </Pressable>
        )}
        <ErrorState
          message={history.error}
          requestId={history.requestId ?? null}
          onRetry={history.refetch}
        />
      </ModuleScreenShell>
    );
  }

  if (history.status === "ready" && history.data.items.length === 0) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>WORKOUT HISTORY</Text>
          <StatusChip status={chipStatus} />
        </View>
        {appleHealthStatus === "not_connected" && (
          <Pressable onPress={goToOverview} style={styles.overviewBtn} accessibilityRole="button">
            <Text style={styles.overviewBtnText}>Go to Training Overview</Text>
          </Pressable>
        )}
        <EmptyState title="No workouts yet" />
      </ModuleScreenShell>
    );
  }

  const items = history.data.items;
  const nextCursor = history.data.nextCursor;

  return (
    <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>WORKOUT HISTORY</Text>
        <StatusChip status={chipStatus} />
      </View>
      {appleHealthStatus === "not_connected" && (
        <Pressable onPress={goToOverview} style={styles.overviewBtn} accessibilityRole="button">
          <Text style={styles.overviewBtnText}>Go to Training Overview</Text>
        </Pressable>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkoutRow item={item} />}
        onEndReached={() => {
          if (nextCursor) history.loadMore();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={false} onRefresh={history.refetch} />}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6E6E73",
    letterSpacing: 0.5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
  },
  chipTitle: { fontSize: 12, color: "#6E6E73" },
  chipStatus: { fontSize: 13, fontWeight: "600", color: "#3C3C43" },
  headerMenuBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerMenuText: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  overviewBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#E5E5EA",
  },
  overviewBtnText: { fontSize: 15, fontWeight: "600", color: "#3C3C43" },
  list: { flex: 1, marginHorizontal: -16 },
  listContent: { paddingBottom: 24 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    gap: 4,
  },
  rowTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  rowTime: { fontSize: 14, color: "#6E6E73" },
  rowMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  rowMetaText: { fontSize: 13, color: "#8E8E93" },
  rowSource: { fontSize: 12, color: "#8E8E93", maxWidth: 160 },
});
