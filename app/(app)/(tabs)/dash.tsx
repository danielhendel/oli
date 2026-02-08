// app/(app)/(tabs)/dash.tsx
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useTimeline } from "@/lib/data/useTimeline";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useMemo } from "react";

function formatIsoToLocal(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString();
}

export default function DashScreen() {
  const router = useRouter();
  const todayKey = useMemo(() => getTodayDayKey(), []);

  const failuresPresence = useFailuresRange(
    { start: "1970-01-01", end: todayKey, limit: 5 },
    { mode: "page" },
  );
  const uploadsPresence = useUploadsPresence();
  const timeline = useTimeline(
    { start: todayKey, end: todayKey },
    { enabled: true },
  );

  const failuresCount =
    failuresPresence.status === "ready" ? failuresPresence.data.items.length : null;
  const uploadsWaiting =
    uploadsPresence.status === "ready" ? uploadsPresence.data.count : null;
  const lastSync =
    uploadsPresence.status === "ready" && uploadsPresence.data.latest
      ? formatIsoToLocal(uploadsPresence.data.latest.receivedAt)
      : null;
  const todayEvents =
    timeline.status === "ready" && timeline.data.days[0]
      ? timeline.data.days[0].canonicalCount
      : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>System status</Text>
        <Text style={styles.subtitle}>Contextual counts only — no metrics</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Failures needing review</Text>
            <Text style={styles.value}>
              {failuresPresence.status === "partial"
                ? "…"
                : typeof failuresCount === "number"
                  ? String(failuresCount)
                  : "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Uploads waiting</Text>
            <Text style={styles.value}>
              {uploadsPresence.status === "partial"
                ? "…"
                : typeof uploadsWaiting === "number"
                  ? String(uploadsWaiting)
                  : "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Last sync</Text>
            <Text style={styles.value}>{lastSync ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Today's events</Text>
            <Text style={styles.value}>
              {timeline.status === "partial"
                ? "…"
                : typeof todayEvents === "number"
                  ? String(todayEvents)
                  : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Text
            style={styles.link}
            onPress={() => router.push("/(app)/failures")}
          >
            View failures
          </Text>
          <Text
            style={styles.link}
            onPress={() => router.push("/(app)/command-center")}
          >
            Command Center (legacy)
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  section: {
    marginTop: 24,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 15, color: "#3C3C43" },
  value: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  actions: { marginTop: 24, gap: 12 },
  link: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
});
