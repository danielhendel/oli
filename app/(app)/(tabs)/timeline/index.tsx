// app/(app)/(tabs)/timeline/index.tsx
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, EmptyState } from "@/lib/ui/ScreenStates";
import { FailClosed } from "@/lib/ui/FailClosed";
import { useTimeline } from "@/lib/data/useTimeline";
import { useMemo } from "react";

function getDefaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function TimelineIndexScreen() {
  const router = useRouter();
  const range = useMemo(() => getDefaultRange(), []);

  const timeline = useTimeline(range, { enabled: true });

  const outcome = useMemo(
    () =>
      timeline.status === "partial"
        ? { status: "partial" as const }
        : timeline.status === "error"
          ? {
              status: "error" as const,
              error: timeline.error,
              requestId: timeline.requestId,
              reason: timeline.reason,
            }
          : { status: "ready" as const, data: timeline.data },
    [timeline],
  );

  return (
    <ScreenContainer>
      <FailClosed
        outcome={outcome}
        onRetry={() => timeline.refetch()}
        loadingMessage="Loading timeline…"
      >
        {(data) => {
          const days = data.days;
          if (days.length === 0) {
            return (
              <>
                <Text style={styles.title}>Timeline</Text>
                <EmptyState
                  title="No days"
                  description="No timeline data for this range."
                />
              </>
            );
          }
          return (
            <ScrollView contentContainerStyle={styles.scroll}>
              <Text style={styles.title}>Timeline</Text>
              <Text style={styles.subtitle}>
                Day list with presence and light counts
              </Text>

              <View style={styles.list}>
                {days.map((d) => (
                  <Pressable
                    key={d.day}
                    style={styles.row}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/(tabs)/timeline/[day]",
                        params: { day: d.day },
                      })
                    }
                    accessibilityLabel={`Day ${d.day}, ${d.canonicalCount} events`}
                  >
                    <Text style={styles.rowDay}>{d.day}</Text>
                    <View style={styles.badges}>
                      <Text style={styles.badge}>
                        {d.canonicalCount} events
                      </Text>
                      {d.hasDailyFacts && (
                        <Text style={styles.badge}>facts</Text>
                      )}
                      {d.hasInsights && (
                        <Text style={styles.badge}>insights</Text>
                      )}
                      {d.hasIntelligenceContext && (
                        <Text style={styles.badge}>context</Text>
                      )}
                      {d.hasDerivedLedger && (
                        <Text style={styles.badge}>ledger</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          );
        }}
      </FailClosed>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  list: {
    marginTop: 24,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  rowDay: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { fontSize: 12, color: "#8E8E93", fontWeight: "600" },
});
