// app/(app)/settings/data-sources/source/[sourceId].tsx — Connected Source Detail (Slice 1)
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import {
  SLICE_1_SOURCE_IDS,
  SOURCE_DISPLAY_NAMES,
  SOURCE_PROVIDES_METRICS,
  getMetricById,
  type Slice1SourceId,
} from "@/lib/metrics/dataSourcesConfig";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";

function isSlice1SourceId(id: string): id is Slice1SourceId {
  return SLICE_1_SOURCE_IDS.includes(id as Slice1SourceId);
}

export default function ConnectedSourceDetailScreen() {
  const { sourceId } = useLocalSearchParams<{ sourceId: string }>();
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const ouraPresence = useOuraPresence();
  const [appleHealthStatus, setAppleHealthStatus] = useState<"loading" | "connected" | "not_connected" | "error">("loading");

  useEffect(() => {
    if (sourceId !== "apple_health" || !user) return;
    let cancelled = false;
    (async () => {
      const token = await getIdToken(false);
      if (!token || cancelled) return;
      const res = await getAppleHealthStatus(token, { cacheBust: `ds-detail:${Date.now()}` });
      if (cancelled) return;
      setAppleHealthStatus(res.ok && res.json.connected ? "connected" : res.ok ? "not_connected" : "error");
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, user, getIdToken]);

  if (!sourceId || !isSlice1SourceId(sourceId)) {
    return (
      <ModuleScreenShell title="Source" subtitle="Unknown source.">
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Unknown source.</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  const title = SOURCE_DISPLAY_NAMES[sourceId];
  const metricIds = SOURCE_PROVIDES_METRICS[sourceId];
  const metricLabels = metricIds.map((id) => getMetricById(id)?.label ?? id).join(", ");

  const statusLine =
    sourceId === "apple_health"
        ? appleHealthStatus === "loading"
          ? "Loading…"
          : appleHealthStatus === "connected"
            ? "Connected"
            : appleHealthStatus === "error"
              ? "Error"
              : "Not connected"
        : sourceId === "oura"
          ? ouraPresence.status === "error"
            ? "Error"
            : ouraPresence.status === "ready"
              ? ouraPresence.data.connected
                ? "Connected"
                : "Not connected"
              : "Loading…"
          : sourceId === "manual"
            ? "Enabled"
            : sourceId === "upload" || sourceId === "labs"
              ? "Available"
              : "—";

  const description =
    sourceId === "apple_health"
        ? "Apple Health can provide steps, activity minutes, HRV, and sleep from your iPhone and Apple Watch."
        : sourceId === "oura"
          ? "Oura can provide sleep duration and HRV. When connected and synced, data appears in your record."
          : sourceId === "manual"
            ? "Log data directly in the app. Manual entry is always available for supported metrics."
            : sourceId === "upload"
              ? "Upload files (e.g. lab PDFs) and track uploads in your record."
              : sourceId === "labs"
                ? "Add lab results and biomarkers in the Labs section."
                : "";

  return (
    <ModuleScreenShell title={title} subtitle={statusLine}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.statusLine}>Status: {statusLine}</Text>
          <Text style={styles.description}>{description}</Text>
          <Text style={styles.metricsLabel}>Metrics this source provides</Text>
          <Text style={styles.metricsList}>{metricLabels}</Text>
        </View>

        {sourceId === "apple_health" && (
          <View style={styles.actions}>
            {appleHealthStatus === "not_connected" ? (
              <Text style={styles.hint}>
                Connect and sync Apple Health from the Devices screen in Settings.
              </Text>
            ) : null}
            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => router.push("/(app)/settings/devices")}
            >
              <Text style={styles.buttonText}>Manage in Devices</Text>
            </Pressable>
          </View>
        )}

        {sourceId === "oura" && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => router.push("/(app)/settings/devices")}
            >
              <Text style={styles.buttonText}>Manage in Devices</Text>
            </Pressable>
          </View>
        )}

        {(sourceId === "manual" || sourceId === "upload" || sourceId === "labs") && (
          <Text style={styles.hint}>No connection required. Use the app to add data.</Text>
        )}
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  placeholder: { padding: 16 },
  placeholderText: { fontSize: 15, color: "#6B7280" },
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  statusLine: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  description: { fontSize: 15, color: "#3C3C43", lineHeight: 22 },
  metricsLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginTop: 4 },
  metricsList: { fontSize: 15, color: "#3C3C43" },
  actions: { marginTop: 20, gap: 10 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  buttonPrimary: { backgroundColor: "#007AFF" },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#8E8E93" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  buttonSecondaryText: { fontSize: 15, fontWeight: "600", color: "#3C3C43" },
  hint: { fontSize: 14, color: "#6B7280", marginTop: 12, lineHeight: 20 },
});
