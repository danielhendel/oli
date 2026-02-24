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
// TEMP DEBUG (W1): remove after HealthKit availability is deterministic.
import { useAuth } from "@/lib/auth/AuthProvider";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState, LoadingState, EmptyState } from "@/lib/ui/ScreenStates";
import {
  requestPermissions,
  pullTodaySnapshot,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  type TodaySnapshot,
  type TodayWorkout,
} from "@/lib/integrations/appleHealth";
import {
  getLastSyncAt,
  setLastSyncAt,
  getAppleHealthConnected,
  setAppleHealthConnected,
  getAppleHealthNotAvailable,
  setAppleHealthNotAvailable,
} from "@/lib/integrations/appleHealth/storage";
import { ingestRawEvent } from "@/lib/api/ingest";

type ConnectionStatus = "loading" | "not_available" | "not_connected" | "connected";

type MaybeIsAvailable = { isAvailable?: unknown };
function getIsAvailableFn(v: unknown): ((cb: (err: unknown, available: boolean) => void) => void) | null {
  if (v == null) return null;
  const cand = (v as MaybeIsAvailable).isAvailable;
  return typeof cand === "function"
    ? (cand as (cb: (err: unknown, available: boolean) => void) => void)
    : null;
}

const CARD_BG = "#F2F2F7";
const RADIUS = 12;

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

export default function TrainingOverviewScreen() {
  const { user, initializing, getIdToken } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<{ message: string; requestId: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const loadStored = useCallback(async (skipNotAvailableCheck?: boolean) => {
    const [sync, connected, notAvailable] = await Promise.all([
      getLastSyncAt(),
      getAppleHealthConnected(),
      getAppleHealthNotAvailable(),
    ]);
    setLastSyncAtState(sync);
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

  function safeKeys(v: unknown): string[] {
    try {
      if (v == null) return [];
      return Object.keys(v as Record<string, unknown>).slice(0, 30);
    } catch {
      return [];
    }
  }

  function asType(v: unknown): string {
    if (v === null) return "null";
    return typeof v;
  }

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

  useEffect(() => {
    // TEMP DEBUG (W1): instrument iOS module shape + isAvailable callback behavior
    if (Platform.OS !== "ios") return;
    let cancelled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const nm = NativeModules as Record<string, unknown>;
      const apple = nm["AppleHealthKit"];
      const rnApple = nm["RNAppleHealthKit"];
      const healthKeys = Object.keys(nm).filter((k) => k.toLowerCase().includes("health")).slice(0, 50);

      console.log("[AHDBG] NativeModules health presence", {
        hasAppleHealthKit: apple != null,
        hasRNAppleHealthKit: rnApple != null,
        healthKeys,
      });
      console.log("[AHDBG] NativeModules AppleHealthKit typeof", { t: apple === null ? "null" : typeof apple });
      console.log("[AHDBG] NativeModules RNAppleHealthKit typeof", { t: rnApple === null ? "null" : typeof rnApple });

      console.log("[AHDBG] import react-native-health: start");
      const mod = await import("react-native-health")
        .then((m) => m)
        .catch((e) => {
          console.log("[AHDBG] import react-native-health: failed", { type: asType(e) });
          return null;
        });

      if (cancelled) return;

      const modAny = mod as unknown as { default?: unknown } | null;
      const def = modAny?.default;

      console.log("[AHDBG] module", {
        modType: asType(mod),
        modKeys: safeKeys(mod),
        hasDefault: def != null,
        defaultType: asType(def),
        defaultKeys: safeKeys(def),
      });

      const isAvailDef = getIsAvailableFn(def);
      const isAvailMod = getIsAvailableFn(mod);

      console.log("[AHDBG] isAvailable typeof", {
        fromMod: typeof isAvailMod,
        fromDefault: typeof isAvailDef,
      });

      const candidate = isAvailDef ? def : isAvailMod ? mod : null;
      const isAvail = isAvailDef ?? isAvailMod;

      if (!candidate || !isAvail) {
        console.log("[AHDBG] no isAvailable function found -> set not_available");
        setConnectionStatus("not_available");
        return;
      }

      console.log("[AHDBG] calling isAvailable");

      watchdog = setTimeout(() => {
        console.log("[AHDBG] isAvailable watchdog timeout (callback not invoked within 3000ms)");
      }, 3000);

      isAvail((err: unknown, available: boolean) => {
        if (watchdog) clearTimeout(watchdog);
        watchdog = null;

        console.log("[AHDBG] isAvailable callback", {
          errType: asType(err),
          errStr: err != null ? String(err) : null,
          available,
        });
      });
    })();

    return () => {
      cancelled = true;
      if (watchdog) clearTimeout(watchdog);
    };
  }, []);

  const refetchSnapshot = useCallback(async () => {
    const result = await pullTodaySnapshot();
    if (result.ok) setSnapshot(result.data);
    else setSnapshot(null);
  }, []);

  useEffect(() => {
    if (connectionStatus === "connected") refetchSnapshot();
  }, [connectionStatus, refetchSnapshot]);

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
      const pull = await pullTodaySnapshot();
      if (!pull.ok) {
        setSyncError({ message: pull.error, requestId: null });
        return;
      }
      const data = pull.data;
      const timezone = getDeviceTimezone();
      const { start, end, day } = getTodayBounds();

      if (data.steps != null && data.steps >= 0) {
        const body = {
          provider: "manual" as const,
          sourceId: "healthkit",
          kind: "steps" as const,
          observedAt: start,
          timeZone: timezone,
          payload: {
            start,
            end,
            timezone,
            day,
            steps: data.steps,
          },
        };
        const res = await ingestRawEvent(body, token, {
          idempotencyKey: stepsIdempotencyKey(day),
          timeoutMs: 15000,
        });
        if (!res.ok) {
          setSyncError({ message: res.error, requestId: res.requestId });
          return;
        }
      }

      for (const w of data.workouts) {
        const payload = {
          start: w.start,
          end: w.end,
          timezone,
          day: day,
          sport: w.activityName || "Workout",
          durationMinutes: Math.max(1, w.durationMinutes),
        };
        const body = {
          provider: "manual" as const,
          sourceId: "healthkit",
          kind: "workout" as const,
          observedAt: w.start,
          timeZone: timezone,
          payload,
        };
        const res = await ingestRawEvent(body, token, {
          idempotencyKey: workoutIdempotencyKey({
            startIso: w.start,
            endIso: w.end,
            activityId: w.activityId,
            sourceId: w.sourceId,
          }),
          timeoutMs: 15000,
        });
        if (!res.ok) {
          setSyncError({ message: res.error, requestId: res.requestId });
          return;
        }
      }

      const nowIso = new Date().toISOString();
      await setLastSyncAt(nowIso);
      setLastSyncAtState(nowIso);
      await refetchSnapshot();
    } finally {
      setSyncing(false);
    }
  }, [connectionStatus, user, getIdToken, refetchSnapshot]);

  if (initializing) {
    return (
      <ModuleScreenShell title="Training Overview" subtitle="Workload & performance">
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title="Training Overview" subtitle="Workload & performance">
        <EmptyState
          title="Sign in to view workouts"
          description="Sign in to see your Apple Health data and sync workouts."
        />
      </ModuleScreenShell>
    );
  }

  return (
    <ModuleScreenShell title="Training Overview" subtitle="Workload & performance">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apple Health</Text>
          <Text style={styles.statusText}>
            Status:{" "}
            {connectionStatus === "loading"
              ? "Loading…"
              : connectionStatus === "not_available"
                ? "Not available"
                : connectionStatus === "not_connected"
                  ? "Not connected"
                  : "Connected"}
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
                <Text style={styles.metricValue}>{snapshot?.steps != null ? snapshot.steps : "—"}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Active minutes</Text>
                <Text style={styles.metricValue}>
                  {snapshot?.exerciseMinutes != null ? snapshot.exerciseMinutes : "—"}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Active energy (kcal)</Text>
                <Text style={styles.metricValue}>
                  {snapshot?.activeEnergyKcal != null ? snapshot.activeEnergyKcal : "—"}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Resting HR (bpm)</Text>
                <Text style={styles.metricValue}>
                  {snapshot?.restingHeartRateBpm != null ? snapshot.restingHeartRateBpm : "—"}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent workouts</Text>
              {snapshot?.workouts && snapshot.workouts.length > 0 ? (
                snapshot.workouts.map((w: TodayWorkout, i: number) => (
                  <View key={w.id || i} style={styles.workoutRow}>
                    <Text style={styles.workoutName}>{w.activityName}</Text>
                    <Text style={styles.workoutMeta}>
                      {w.durationMinutes} min · {w.calories} kcal
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.placeholder}>No workouts today</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last sync</Text>
              <Text style={styles.syncTime}>{formatSyncTime(lastSyncAt)}</Text>
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
});