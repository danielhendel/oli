// app/(app)/(tabs)/library/[category].tsx
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useMemo } from "react";
import type { CanonicalEventListItem } from "@oli/contracts";

const CATEGORY_KINDS: Record<string, string[]> = {
  strength: ["strength_workout"],
  cardio: ["steps", "workout"],
  sleep: ["sleep"],
  hrv: ["hrv"],
  labs: [],
  uploads: [],
  failures: [],
};

function getRangeForEvents(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatIsoToShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupEventsByDay(items: CanonicalEventListItem[]): Map<string, CanonicalEventListItem[]> {
  const map = new Map<string, CanonicalEventListItem[]>();
  for (const item of items) {
    const day = item.day;
    const list = map.get(day) ?? [];
    list.push(item);
    map.set(day, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  }
  return map;
}

export default function LibraryCategoryScreen() {
  const params = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const category = params.category ?? "strength";
  const kinds = CATEGORY_KINDS[category] ?? [];

  const range = useMemo(() => getRangeForEvents(), []);

  const events = useEvents(
    kinds.length > 0
      ? { start: range.start, end: range.end, kinds, limit: 100 }
      : { start: range.start, end: range.end, limit: 100 },
    { enabled: category !== "uploads" && category !== "failures" },
  );

  const isContractError =
    events.status === "error" &&
    (events.error?.toLowerCase().includes("invalid") ?? false);

  if (category === "uploads" || category === "failures") {
    return (
      <ScreenContainer>
        <View style={styles.placeholder}>
          <Text style={styles.title}>{category}</Text>
          <Text style={styles.subtitle}>
            Use Timeline or Failures screen for uploads and failures.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (events.status === "loading") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading events…" />
      </ScreenContainer>
    );
  }

  if (events.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState
          message={events.error}
          requestId={events.requestId}
          onRetry={() => events.refetch()}
          isContractError={isContractError}
        />
      </ScreenContainer>
    );
  }

  const grouped = groupEventsByDay(events.data.items);
  const days = Array.from(grouped.keys()).sort().reverse();

  if (days.length === 0) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>{category}</Text>
        <EmptyState title="No events" description="No events in this category yet." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{category}</Text>
        <Text style={styles.subtitle}>Day-grouped, reverse chronological</Text>

        {days.map((day) => (
          <View key={day} style={styles.daySection}>
            <Text style={styles.dayHeader}>{day}</Text>
            {(grouped.get(day) ?? []).map((ev) => (
              <Pressable
                key={ev.id}
                style={styles.eventRow}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/event/[id]",
                    params: { id: ev.id },
                  })
                }
              >
                <Text style={styles.eventKind}>{ev.kind}</Text>
                <Text style={styles.eventTime}>{formatIsoToShort(ev.start)}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  placeholder: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  daySection: { marginTop: 20 },
  dayHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    marginBottom: 6,
  },
  eventKind: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  eventTime: { fontSize: 14, color: "#8E8E93" },
});
