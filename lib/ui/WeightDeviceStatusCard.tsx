// lib/ui/WeightDeviceStatusCard.tsx — Device card: icon, title, status pill, manage, last sync.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
        <View style={styles.row}>
          <Ionicons name="scale-outline" size={24} color="#3C3C43" style={styles.icon} />
          <View style={styles.left}>
            <Text style={styles.cardTitle}>Withings</Text>
            <Text style={styles.sub}>
              Importing history…{count != null ? ` ${count} entries processed` : ""}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (connected) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="scale-outline" size={24} color="#3C3C43" style={styles.icon} />
          <View style={styles.left}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>Withings</Text>
              <View style={styles.pillConnected}>
                <Text style={[styles.pillText, styles.pillTextConnected]}>Connected</Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {lastMeasurementAt
                ? `Last sync: ${formatLastSync(lastMeasurementAt)}`
                : "No recent sync"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(app)/settings/devices")}
            style={styles.manageBtn}
            accessibilityRole="button"
            accessibilityLabel="Manage devices"
          >
            <Text style={styles.manageBtnText}>Manage</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="scale-outline" size={24} color="#8E8E93" style={styles.icon} />
        <View style={styles.left}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Withings</Text>
<View style={styles.pillDisconnected}>
            <Text style={[styles.pillText, styles.pillTextDisconnected]}>Not connected</Text>
            </View>
          </View>
          <Text style={styles.sub}>Connect a device to auto-sync weight.</Text>
        </View>
      </View>
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

const CARD_SURFACE = "#E5E5EA";
const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_SURFACE,
    borderRadius: CARD_RADIUS,
    padding: 16,
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { marginRight: 4 },
  left: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  pillConnected: {
    backgroundColor: "#34C759",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillDisconnected: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  pillTextConnected: { color: "#FFFFFF" },
  pillTextDisconnected: { color: "#3C3C43" },
  sub: { fontSize: 13, color: "#6E6E73", lineHeight: 18 },
  manageBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  manageBtnText: { fontSize: 15, fontWeight: "600", color: "#007AFF" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
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
