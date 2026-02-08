// app/(app)/(tabs)/timeline/[day].tsx
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useFailures } from "@/lib/data/useFailures";
import { useMemo, useState } from "react";
import type { CanonicalEventListItem } from "@oli/contracts";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function formatIsoToShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByKind(items: CanonicalEventListItem[]): Map<string, CanonicalEventListItem[]> {
  const map = new Map<string, CanonicalEventListItem[]>();
  for (const item of items) {
    const list = map.get(item.kind) ?? [];
    list.push(item);
    map.set(item.kind, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  }
  return map;
}

export default function TimelineDayScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const router = useRouter();
  const dayParam = params.day ?? "";
  const day = YYYY_MM_DD.test(dayParam) ? dayParam : "";

  const [provenanceExpanded, setProvenanceExpanded] = useState(false);

  const startIso = `${day}T00:00:00.000Z`;
  const endIso = `${day}T23:59:59.999Z`;

  const events = useEvents(
    { start: startIso, end: endIso, limit: 100 },
    { enabled: !!day },
  );

  const failures = useFailures({ day }, { enabled: !!day });

  const hasFailures =
    failures.status === "ready" && failures.data.items.length > 0;

  const autoExpandProvenance = useMemo(
    () => hasFailures || provenanceExpanded,
    [hasFailures, provenanceExpanded],
  );

  const isContractError =
    events.status === "error" &&
    (events.error?.toLowerCase().includes("invalid") ?? false);

  if (!day) {
    return (
      <ScreenContainer>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  if (events.status === "loading") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading day…" />
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

  const items = events.data.items;
  const grouped = groupByKind(items);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{day}</Text>
        <Text style={styles.subtitle}>
          Canonical events, derived presence, failures
        </Text>

        {hasFailures && (
          <View style={styles.failuresBanner}>
            <Text style={styles.failuresBannerText}>
              {failures.status === "ready"
                ? `${failures.data.items.length} failure(s) recorded`
                : "Failures present"}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events</Text>
          {items.length === 0 ? (
            <EmptyState title="No events" description="No events for this day." />
          ) : (
            Array.from(grouped.entries()).map(([kind, evs]) => (
              <View key={kind} style={styles.kindGroup}>
                <Text style={styles.kindHeader}>{kind}</Text>
                {evs.map((ev) => (
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
                    <Text style={styles.eventTime}>
                      {formatIsoToShort(ev.start)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </View>

        <Pressable
          style={styles.provenanceToggle}
          onPress={() => setProvenanceExpanded(!provenanceExpanded)}
        >
          <Text style={styles.provenanceToggleText}>
            {autoExpandProvenance ? "▼" : "▶"} Provenance
          </Text>
        </Pressable>
        {autoExpandProvenance && (
          <View style={styles.provenanceContent}>
            <Text style={styles.provenanceText}>
              Day: {day}. Provenance collapsed by default, auto-expanded when
              failures exist.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  failuresBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
  },
  failuresBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7A4E00",
  },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  kindGroup: { marginBottom: 16 },
  kindHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 6,
  },
  eventRow: {
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    marginBottom: 6,
  },
  eventTime: { fontSize: 15, color: "#1C1C1E" },
  provenanceToggle: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  provenanceToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  provenanceContent: { marginTop: 8, padding: 12 },
  provenanceText: { fontSize: 14, color: "#8E8E93", lineHeight: 20 },
});
