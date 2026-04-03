/**
 * DEV-ONLY — Integration probe: Apple Health workouts.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvents } from "@/lib/api/usersMe";
import { getLastSyncAt } from "@/lib/integrations/appleHealth/storage";
import { getWorkoutsAnchor, setWorkoutsAnchor } from "@/lib/integrations/appleHealth/anchor";
import { runAnchoredWorkoutsSync } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import {
  pullAnchoredWorkouts,
  pullTodaySnapshot,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
} from "@/lib/integrations/appleHealth";
import { ingestRawEvent } from "@/lib/api/ingest";

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

export default function DebugIntegrationsScreen() {
  const { user, getIdToken } = useAuth();
  const [appleLastSyncAt, setAppleLastSyncAt] = useState<string | null>(null);
  const [appleAnchor, setAppleAnchor] = useState<string | null>(null);
  const [appleSyncResult, setAppleSyncResult] = useState<{
    ok: boolean;
    error?: string;
    requestId?: string | null;
    mayHaveMoreWorkouts?: boolean;
  } | null>(null);
  const [appleRawWorkouts, setAppleRawWorkouts] = useState<{
    count: number;
    items: { id: string; observedAt: string; sourceId: string; receivedAt?: string }[];
    requestId?: string | null;
    error?: string;
  } | null>(null);
  const [appleLastSyncAtAfter, setAppleLastSyncAtAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const runAppleProbe = useCallback(async () => {
    if (!user) return;
    setLoading("apple");
    setAppleSyncResult(null);
    setAppleRawWorkouts(null);
    setAppleLastSyncAtAfter(null);
    try {
      const [lastSync, anchor] = await Promise.all([
        getLastSyncAt(),
        getWorkoutsAnchor(user.uid),
      ]);
      setAppleLastSyncAt(lastSync);
      setAppleAnchor(anchor ?? null);

      const token = await getIdToken(false);
      if (!token) {
        setAppleSyncResult({ ok: false, error: "No auth token", requestId: null });
        return;
      }

      const result = await runAnchoredWorkoutsSync(
        { uid: user.uid, token, limit: 500 },
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
        setAppleSyncResult({
          ok: false,
          error: result.error,
          requestId: result.requestId ?? null,
        });
      } else {
        setAppleSyncResult({
          ok: true,
          mayHaveMoreWorkouts: result.mayHaveMoreWorkouts,
        });
      }

      const lastSyncAfter = await getLastSyncAt();
      setAppleLastSyncAtAfter(lastSyncAfter);

      const cacheBust = `debug:${Date.now()}`;
      const rawRes = await getRawEvents(token, {
        kinds: ["workout"],
        limit: 5,
        cacheBust,
      });
      if (!rawRes.ok) {
        setAppleRawWorkouts({
          count: 0,
          items: [],
          requestId: rawRes.requestId,
          error: rawRes.error,
        });
        return;
      }
      const items = rawRes.json.items.map((i) => ({
        id: i.id,
        observedAt: i.observedAt,
        sourceId: i.sourceId,
        receivedAt: i.receivedAt,
      }));
      setAppleRawWorkouts({
        count: items.length,
        items,
        requestId: rawRes.requestId,
      });
    } finally {
      setLoading(null);
    }
  }, [user, getIdToken]);

  if (!__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.warning}>This screen is only available in development.</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.warning}>Sign in to run integration probes.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Integration probes (DEV)</Text>
      <Text style={styles.hint}>No secrets logged. Only requestId, counts, timestamps.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apple Health</Text>
        <View style={styles.block}>
          <Text style={styles.label}>Last sync / Anchor (before run)</Text>
          <Text selectable style={styles.mono}>
            getLastSyncAt()={appleLastSyncAt ?? "null"} getWorkoutsAnchor(uid)=
            {appleAnchor ?? "null"}
          </Text>
        </View>
        <Pressable
          onPress={runAppleProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "apple" && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading === "apple" ? "Running…" : "Sync Now + Fetch workout raw-events"}
          </Text>
        </Pressable>
        {appleSyncResult != null && (
          <View style={styles.block}>
            <Text style={styles.label}>Sync result</Text>
            <Text selectable style={styles.mono}>
              ok={String(appleSyncResult.ok)}
              {appleSyncResult.requestId != null ? ` requestId=${appleSyncResult.requestId}` : ""}
            </Text>
            {appleSyncResult.error != null && (
              <Text style={styles.error}>{appleSyncResult.error}</Text>
            )}
          </View>
        )}
        {appleLastSyncAtAfter != null && (
          <View style={styles.block}>
            <Text style={styles.label}>getLastSyncAt() after run</Text>
            <Text selectable style={styles.mono}>{appleLastSyncAtAfter}</Text>
          </View>
        )}
        {appleRawWorkouts != null && (
          <View style={styles.block}>
            <Text style={styles.label}>Workout raw-events (limit 5)</Text>
            <Text selectable style={styles.mono}>
              count={appleRawWorkouts.count} requestId={appleRawWorkouts.requestId ?? "null"}
            </Text>
            {appleRawWorkouts.items.map((i, idx) => (
              <Text key={idx} selectable style={styles.monoSmall}>
                id={i.id} observedAt={i.observedAt} sourceId={i.sourceId} receivedAt=
                {i.receivedAt ?? "—"}
              </Text>
            ))}
            {appleRawWorkouts.error != null && (
              <Text style={styles.error}>{appleRawWorkouts.error}</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  warning: { fontSize: 15, color: "#8E8E93", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  hint: { fontSize: 12, color: "#8E8E93" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#3C3C43" },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  block: { backgroundColor: "#F2F2F7", padding: 12, borderRadius: 10, gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#6E6E73" },
  mono: { fontFamily: "Menlo", fontSize: 11, color: "#1C1C1E" },
  monoSmall: { fontFamily: "Menlo", fontSize: 10, color: "#3C3C43" },
  error: { fontSize: 12, color: "#FF3B30" },
});
