/**
 * Workouts Overview — W1 Apple Health integration.
 * Connection status, today metrics (steps, active minutes, active energy, resting HR),
 * recent workouts, last sync, manual "Sync now". Fail-closed: requestId on all API failures.
 *
 * INGESTION: Steps and workouts only (existing kinds). Resting HR, active energy, exercise time:
 * contract kind="incomplete" allows only payload.note (no structured fields); we show them in UI only and do NOT ingest.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, NativeModules } from "react-native";
import { useNavigation } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState, LoadingState, EmptyState } from "@/lib/ui/ScreenStates";
import {
  requestPermissions,
  pullTodaySnapshot,
  pullAnchoredWorkouts,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  type TodaySnapshot,
  type TodayWorkout,
} from "@/lib/integrations/appleHealth";
import { getWorkoutsAnchor, setWorkoutsAnchor } from "@/lib/integrations/appleHealth/anchor";
import { runAnchoredWorkoutsSync } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import {
  getLastSyncAt,
  setLastSyncAt,
  getAppleHealthLastCheckedAt,
  setAppleHealthLastCheckedAt,
  getAppleHealthConnected,
  setAppleHealthConnected,
  getAppleHealthNotAvailable,
  setAppleHealthNotAvailable,
} from "@/lib/integrations/appleHealth/storage";
import { ingestRawEvent } from "@/lib/api/ingest";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";

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
const CARD_BG = "#F2F2F7";
const RADIUS = 12;
const SHELL_TITLE = "Workouts";
const SHELL_SUBTITLE = "Strength & cardio";
const METRIC_LABEL = "Training Overview";

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

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "Never";
    return d.toLocaleString();
  } catch {
    return "Never";
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
  title,
  status,
  onPress,
  disabled,
}: {
  title: string;
  status: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const pressable = typeof onPress === "function";
  const Comp = pressable ? Pressable : View;
  return (
    <Comp
      {...(pressable
        ? {
            onPress,
            disabled,
            accessibilityRole: "button" as const,
            accessibilityLabel: `${title} ${status}`,
          }
        : {})}
      style={[styles.chip, disabled && styles.chipDisabled]}
    >
      <Text style={styles.chipTitle}>{title}</Text>
      <Text style={styles.chipStatus}>{status}</Text>
    </Comp>
  );
}

function PlaceholderTile({ label }: { label: string }) {
  return (
    <View style={styles.insightTile}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>Coming soon</Text>
    </View>
  );
}

export default function TrainingOverviewScreen() {
  const navigation = useNavigation();
  const { user, initializing, getIdToken } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAtState] = useState<string | null>(null);
  const [serverLastSyncAt, setServerLastSyncAt] = useState<string | null>(null);
  const [statusFetchError, setStatusFetchError] = useState<{ message: string; requestId: string | null } | null>(null);
  const [syncError, setSyncError] = useState<{ message: string; requestId: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <OverflowMenuButton onPress={() => setMenuOpen(true)} />,
      title: SHELL_TITLE,
    });
  }, [navigation]);

  const loadStored = useCallback(async (skipNotAvailableCheck?: boolean) => {
    const [sync, checked, connected, notAvailable] = await Promise.all([
      getLastSyncAt(),
      getAppleHealthLastCheckedAt(),
      getAppleHealthConnected(),
      getAppleHealthNotAvailable(),
    ]);
    setLastSyncAtState(sync);
    setLastCheckedAtState(checked);
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

  const fetchServerStatus = useCallback(async () => {
    const token = await getIdToken(false);
    if (!token) return;
    setStatusFetchError(null);
    const res = await getAppleHealthStatus(token, { cacheBust: `status:${Date.now()}` });
    if (res.ok) {
      setServerLastSyncAt(res.json.lastSyncAt);
    } else {
      setStatusFetchError({ message: res.error, requestId: res.requestId ?? null });
    }
  }, [getIdToken]);

  useEffect(() => {
    if (connectionStatus === "connected" && user) void fetchServerStatus();
  }, [connectionStatus, user, fetchServerStatus]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setSyncError(null);
    try {
      const result = await requestPermissions();
      if (result.ok) {
        await setAppleHealthConnected(true);
        await setAppleHealthNotAvailable(false);
        setConnectionStatus("connected");
        await refetchSnapshot();
      } else {
        await setAppleHealthConnected(false);
        if (result.error.toLowerCase().includes("not available")) {
          console.log("[AH] status set Not available", { platform: Platform.OS });
          await setAppleHealthNotAvailable(true);
          setConnectionStatus("not_available");
        } else {
          setConnectionStatus("not_connected");
        }
      }
    } finally {
      setConnecting(false);
    }
  }, [refetchSnapshot]);

  const handleSyncNow = useCallback(async () => {
    if (connectionStatus !== "connected" || !user) return;
    const token = await getIdToken(false);
    if (!token) {
      setSyncError({ message: "Not signed in", requestId: null });
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await runAnchoredWorkoutsSync(
        { uid: user.uid, token, limit: ANCHOR_LIMIT },
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
        setSyncError({ message: result.error, requestId: result.requestId });
        return;
      }
      const nowIso = new Date().toISOString();
      try {
        await setAppleHealthLastCheckedAt(nowIso);
      } catch {
        // Best-effort; do not throw.
      }
      setLastCheckedAtState(nowIso);
      await setLastSyncAt(nowIso);
      setLastSyncAtState(nowIso);
      setServerLastSyncAt(nowIso);
      await refetchSnapshot();
    } finally {
      setSyncing(false);
    }
  }, [connectionStatus, user, getIdToken, refetchSnapshot]);

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
    <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
      <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricHeaderLabel}>{METRIC_LABEL}</Text>
          <StatusChip
            title="Apple Health"
            status={
              connectionStatus === "loading"
                ? "Loading…"
                : connectionStatus === "not_available"
                  ? "Not available"
                  : connectionStatus === "not_connected"
                    ? "Not connected"
                    : "Connected"
            }
            {...(connectionStatus === "not_connected"
              ? { onPress: () => { void handleConnect(); }, disabled: connecting }
              : {})}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection</Text>
          <Text style={styles.statusText}>
            {connectionStatus === "loading"
              ? "Checking Apple Health…"
              : connectionStatus === "not_available"
                ? "Apple Health is not available on this device (e.g. not iOS)."
                : connectionStatus === "not_connected"
                  ? "Connect to sync steps and workouts from Apple Health."
                  : "Connected. Today's data can be synced below."}
          </Text>
          {connectionStatus === "not_connected" && (
            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              style={[styles.primaryBtn, connecting && styles.primaryBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Connect Apple Health"
            >
              <Text style={styles.primaryBtnText}>{connecting ? "Connecting…" : "Connect Apple Health"}</Text>
            </Pressable>
          )}
        </View>

        {syncError && (
          <View style={styles.errorCard}>
            <ErrorState message={syncError.message} requestId={syncError.requestId} onRetry={() => setSyncError(null)} />
            <Text style={styles.requestIdLine}>
              Request ID: {syncError.requestId != null ? syncError.requestId : "null"}
            </Text>
          </View>
        )}

        {connectionStatus === "connected" && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Steps</Text>
                <Text style={styles.metricValue}>{snapshot?.steps != null ? Math.round(snapshot.steps) : "—"}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Exercise time</Text>
                <Text style={styles.metricValue}>
                  {snapshot?.exerciseMinutes != null ? Math.round(snapshot.exerciseMinutes) : "—"}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Active energy (kcal)</Text>
                <Text style={styles.metricValue}>
                  {snapshot?.activeEnergyKcal != null ? Math.round(snapshot.activeEnergyKcal) : "—"}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Resting HR (bpm)</Text>
                <Text style={styles.metricValue}>
                  {snapshot?.restingHeartRateBpm != null ? Math.round(snapshot.restingHeartRateBpm) : "—"}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trends</Text>
              <Text style={styles.placeholder}>Coming soon…</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Insights</Text>
              <View style={styles.insightsRow}>
                <PlaceholderTile label="Load" />
                <PlaceholderTile label="Recovery" />
                <PlaceholderTile label="Volume" />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent workouts</Text>
              {snapshot?.workouts && snapshot.workouts.length > 0 ? (
                snapshot.workouts.map((w: TodayWorkout, i: number) => (
                  <View key={w.id || i} style={styles.workoutRow}>
                    <Text style={styles.workoutName}>{w.activityName}</Text>
                    <Text style={styles.workoutMeta}>
                      {w.durationMinutes} min · {Math.round(w.calories)} kcal
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.placeholder}>No workouts today</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>History</Text>
              <Text style={styles.placeholder}>Coming soon.</Text>
              <Pressable
                onPress={() => { /* disabled */ }}
                disabled
                style={[styles.secondaryBtn, styles.secondaryBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="View history"
              >
                <Text style={styles.secondaryBtnText}>View history</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last sync</Text>
              <Text style={styles.metricLabel}>Last sync (local)</Text>
              <Text style={styles.syncTime}>{formatSyncTime(lastSyncAt)}</Text>
              <Text style={styles.metricLabel}>Last checked</Text>
              <Text style={styles.syncTime}>{formatSyncTime(lastCheckedAt)}</Text>
              <Text style={styles.metricLabel}>Last new data</Text>
              <Text style={styles.syncTime}>{formatSyncTime(serverLastSyncAt)}</Text>
              {statusFetchError && (
                <Text style={styles.requestIdLine}>
                  Status unavailable · Request ID: {statusFetchError.requestId ?? "—"}
                </Text>
              )}
              <Pressable
                onPress={handleSyncNow}
                disabled={syncing}
                style={[styles.primaryBtn, syncing && styles.primaryBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={syncing ? "Syncing…" : "Sync now"}
              >
                <Text style={styles.primaryBtnText}>{syncing ? "Syncing…" : "Sync now"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {connectionStatus === "not_available" && (
          <Text style={styles.hint}>Apple Health is not available on this device (e.g. not iOS).</Text>
        )}
      </ScrollView>
      {menuOpen && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuOpen(false)}
          accessibilityLabel="Close menu"
        >
          <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle}>Workouts</Text>
            <Text style={styles.placeholder}>Menu options coming soon.</Text>
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
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  statusText: { fontSize: 15, color: "#3C3C43" },
  primaryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  errorCard: { backgroundColor: "#FFF5F5", borderRadius: RADIUS, padding: 16, gap: 8 },
  requestIdLine: { fontSize: 12, fontFamily: "monospace", color: "#8E8E93" },
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { fontSize: 15, color: "#3C3C43" },
  metricValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  workoutRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#E5E5EA" },
  workoutName: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  workoutMeta: { fontSize: 13, color: "#6E6E73", marginTop: 2 },
  placeholder: { fontSize: 15, color: "#8E8E93" },
  syncTime: { fontSize: 15, color: "#3C3C43" },
  hint: { fontSize: 14, color: "#8E8E93", fontStyle: "italic" },
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metricHeaderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6E6E73",
    textTransform: "uppercase",
  },
  headerMenuBtn: { padding: 12 },
  headerMenuText: { fontSize: 18, color: "#1C1C1E", fontWeight: "700" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#F2F2F7",
  },
  chipDisabled: { opacity: 0.6 },
  chipTitle: { fontSize: 13, fontWeight: "600", color: "#3C3C43" },
  chipStatus: { fontSize: 12, fontWeight: "600", color: "#007AFF" },
  insightsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  insightTile: {
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  insightLabel: { fontSize: 12, color: "#6E6E73", marginBottom: 4 },
  insightValue: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
  secondaryBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#F2F2F7",
  },
  secondaryBtnDisabled: { opacity: 0.55 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600", color: "#3C3C43" },
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
});