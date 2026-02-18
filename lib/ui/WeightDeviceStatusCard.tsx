// lib/ui/WeightDeviceStatusCard.tsx — Device trust layer for Weight page.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { WithingsBackfillState } from "@/lib/data/useWithingsPresence";

export type WeightDeviceStatusCardProps = {
  connected: boolean;
  lastMeasurementAt: string | null;
  backfill?: WithingsBackfillState;
  onLogManually: () => void;
};

function formatLastSync(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const d = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffMs / 86400_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function WeightDeviceStatusCard({
  connected,
  lastMeasurementAt,
  backfill,
  onLogManually,
}: WeightDeviceStatusCardProps) {
  const router = useRouter();
  const backfillRunning = backfill?.status === "running";

  if (backfillRunning) {
    const count = backfill.processedCount;
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Importing history…</Text>
        {count != null ? (
          <Text style={styles.sub}>{count} entries processed</Text>
        ) : null}
      </View>
    );
  }

  if (connected) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.title}>Withings connected</Text>
            {lastMeasurementAt ? (
              <Text style={styles.sub}>Last sync: {formatLastSync(lastMeasurementAt)}</Text>
            ) : (
              <Text style={styles.sub}>No recent sync</Text>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(app)/settings/devices")}
            style={styles.link}
            accessibilityRole="button"
            accessibilityLabel="Manage devices"
          >
            <Text style={styles.linkText}>Manage</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>No scale connected</Text>
      <Text style={styles.sub}>Connect a device to auto-sync weight.</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/(app)/settings/devices")}
          style={styles.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Connect Withings"
        >
          <Text style={styles.primaryBtnText}>Connect Withings</Text>
        </Pressable>
        <Pressable
          onPress={onLogManually}
          style={styles.secondaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Log manually"
        >
          <Text style={styles.secondaryBtnText}>Log manually</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  sub: { fontSize: 13, color: "#6E6E73", lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flex: 1, minWidth: 0 },
  link: { paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { fontSize: 15, fontWeight: "600", color: "#007AFF" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  primaryBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#E5E5EA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnText: { color: "#1C1C1E", fontSize: 15, fontWeight: "600" },
});
