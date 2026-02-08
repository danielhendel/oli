// app/(app)/event/[id].tsx
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useLineage } from "@/lib/data/useLineage";
import { useFailures } from "@/lib/data/useFailures";
import { useMemo, useState } from "react";

function formatIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id ?? "";

  const [provenanceExpanded, setProvenanceExpanded] = useState(false);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 365);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);

  const events = useEvents(
    { start: range.start, end: range.end, limit: 500 },
    { enabled: !!eventId },
  );

  const event = useMemo(() => {
    if (events.status !== "ready") return null;
    return events.data.items.find((e) => e.id === eventId) ?? null;
  }, [events, eventId]);

  const lineage = useLineage(
    { canonicalEventId: eventId },
    { enabled: !!eventId },
  );

  const failures = useFailures(
    { day: event?.day ?? "" },
    { enabled: !!event?.day },
  );

  const hasFailures =
    failures.status === "ready" && failures.data.items.length > 0;
  const autoExpandProvenance = provenanceExpanded || hasFailures;

  const isContractError =
    (events.status === "error" &&
      (events.error?.toLowerCase().includes("invalid") ?? false)) ||
    (lineage.status === "error" &&
      (lineage.error?.toLowerCase().includes("invalid") ?? false));

  if (!eventId) {
    return (
      <ScreenContainer>
        <ErrorState message="Missing event ID" />
      </ScreenContainer>
    );
  }

  if (events.status === "loading" || (event && lineage.status === "loading")) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading event…" />
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

  if (!event) {
    return (
      <ScreenContainer>
        <ErrorState message="Event not found" />
      </ScreenContainer>
    );
  }

  if (lineage.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState
          message={lineage.error}
          requestId={lineage.requestId}
          onRetry={() => lineage.refetch()}
          isContractError={isContractError}
        />
      </ScreenContainer>
    );
  }

  const lineageData = lineage.status === "ready" ? lineage.data : null;
  const canonicalEventId = event.id;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Event</Text>
        <Text style={styles.subtitle}>Canonical fields + provenance</Text>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Kind</Text>
          <Text style={styles.fieldValue}>{event.kind}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Start</Text>
          <Text style={styles.fieldValue}>{formatIso(event.start)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>End</Text>
          <Text style={styles.fieldValue}>{formatIso(event.end)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Day</Text>
          <Text style={styles.fieldValue}>{event.day}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Source</Text>
          <Text style={styles.fieldValue}>{event.sourceId}</Text>
        </View>

        <Pressable
          style={styles.lineageCta}
          onPress={() =>
            router.push(`/(app)/(tabs)/library/lineage/${canonicalEventId}`)
          }
        >
          <Text style={styles.lineageCtaText}>View lineage</Text>
        </Pressable>
        <Pressable
          style={styles.provenanceToggle}
          onPress={() => setProvenanceExpanded(!provenanceExpanded)}
        >
          <Text style={styles.provenanceToggleText}>
            {autoExpandProvenance ? "▼" : "▶"} Provenance / Lineage
          </Text>
        </Pressable>
        {autoExpandProvenance && lineageData && (
          <View style={styles.provenanceContent}>
            <Text style={styles.provenanceLabel}>Raw event IDs</Text>
            <Text style={styles.provenanceValue}>
              {lineageData.rawEventIds.join(", ") || "—"}
            </Text>
            <Text style={styles.provenanceLabel}>Canonical event ID</Text>
            <Text style={styles.provenanceValue}>
              {lineageData.canonicalEventId ?? "—"}
            </Text>
            <Text style={styles.provenanceLabel}>Derived ledger runs</Text>
            <Text style={styles.provenanceValue}>
              {lineageData.derivedLedgerRuns.length > 0
                ? lineageData.derivedLedgerRuns
                    .map((r) => `${r.day} / ${r.runId}`)
                    .join("; ")
                : "—"}
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
  section: { marginTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginBottom: 4 },
  fieldValue: { fontSize: 17, color: "#1C1C1E" },
  lineageCta: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  lineageCtaText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  provenanceToggle: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  provenanceToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  provenanceContent: { marginTop: 8, padding: 12, gap: 8 },
  provenanceLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
  provenanceValue: { fontSize: 14, color: "#1C1C1E", lineHeight: 20 },
});
