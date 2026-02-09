// app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx
// Sprint 4 — Lineage & Explainability UI
// Every data point explainable: raw → canonical → derived with "why this value exists" narrative.

import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState } from "@/lib/ui/ScreenStates";
import { useLineage } from "@/lib/data/useLineage";
import { useEvents } from "@/lib/data/useEvents";
import { useFailures } from "@/lib/data/useFailures";
import { useMemo, useState } from "react";
import type { LineageResponseDto } from "@oli/contracts";

function formatIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
};

function LineageSection({ title, children, defaultExpanded = false }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionToggle}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.sectionToggleText}>
          {expanded ? "▼" : "▶"} {title}
        </Text>
      </Pressable>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

export default function LineageScreen() {
  const params = useLocalSearchParams<{ canonicalEventId: string }>();
  const canonicalEventId = params.canonicalEventId ?? "";

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 365);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);

  const lineage = useLineage(
    { canonicalEventId },
    { enabled: !!canonicalEventId },
  );

  const events = useEvents(
    { start: range.start, end: range.end, limit: 500 },
    { enabled: !!canonicalEventId && lineage.status === "ready" },
  );

  const canonicalEvent = useMemo(() => {
    if (events.status !== "ready") return null;
    return events.data.items.find((e) => e.id === canonicalEventId) ?? null;
  }, [events, canonicalEventId]);

  const failures = useFailures(
    { day: canonicalEvent?.day ?? "" },
    { enabled: !!canonicalEvent?.day },
  );

  const hasFailures =
    failures.status === "ready" && failures.data.items.length > 0;
  const hasAnomalies =
    (lineage.status === "ready" && lineage.data.rawEventIds.length === 0) ||
    (lineage.status === "ready" && !lineage.data.canonicalEventId);
  const autoExpandProvenance = hasFailures || hasAnomalies;

  const isContractError =
    lineage.status === "error" && lineage.reason === "contract";

  // Fail-closed: contract mismatch → ErrorState, no partial render
  if (lineage.status === "error" && isContractError) {
    return (
      <ScreenContainer>
        <ErrorState
          message={lineage.error}
          requestId={lineage.requestId}
          onRetry={() => lineage.refetch()}
          isContractError={true}
        />
      </ScreenContainer>
    );
  }

  if (!canonicalEventId) {
    return (
      <ScreenContainer>
        <ErrorState message="Missing event ID" />
      </ScreenContainer>
    );
  }

  if (lineage.status === "partial" || lineage.status === "missing") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading lineage…" />
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
          isContractError={false}
        />
      </ScreenContainer>
    );
  }

  const lineageData = lineage.data;
  const hasDerivedLedgerDay = lineageData.derivedLedgerRuns.length > 0;

  // Fail-closed: missing required references → FailureState (canonicalEventId required)
  const missingCanonical = !lineageData.canonicalEventId;
  if (missingCanonical) {
    return (
      <ScreenContainer>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Lineage incomplete</Text>
          <Text style={styles.errorMessage}>
            Canonical event reference is missing. This may indicate a data
            consistency issue.
          </Text>
          <Text style={styles.failureHint}>Report issue or view failures.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Lineage</Text>
        <Text style={styles.subtitle}>Why this value exists</Text>

        {/* A) Canonical Event */}
        <LineageSection
          title="Canonical Event"
          defaultExpanded={autoExpandProvenance}
        >
          {canonicalEvent ? (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Kind</Text>
              <Text style={styles.fieldValue}>{canonicalEvent.kind}</Text>
              <Text style={styles.fieldLabel}>Time</Text>
              <Text style={styles.fieldValue}>{formatIso(canonicalEvent.start)}</Text>
              <Text style={styles.fieldLabel}>Day</Text>
              <Text style={styles.fieldValue}>{canonicalEvent.day}</Text>
              <Text style={styles.fieldLabel}>Timezone</Text>
              <Text style={styles.fieldValue}>{canonicalEvent.timezone}</Text>
              <Text style={styles.fieldLabel}>Source</Text>
              <Text style={styles.fieldValue}>{canonicalEvent.sourceId}</Text>
              <Text style={styles.fieldLabel}>ID</Text>
              <Text style={styles.fieldValue}>{lineageData.canonicalEventId ?? "—"}</Text>
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              ID: {lineageData.canonicalEventId ?? "—"}
            </Text>
          )}
        </LineageSection>

        {/* B) Raw Events */}
        <LineageSection
          title="Raw Events"
          defaultExpanded={autoExpandProvenance}
        >
          <View style={styles.card}>
            {lineageData.rawEventIds.length > 0 ? (
              lineageData.rawEventIds.map((id) => (
                <View key={id} style={styles.rawEventRow}>
                  <Text style={styles.rawEventId}>{id}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.fieldValue}>No raw event IDs (orphaned or fact-only)</Text>
            )}
          </View>
        </LineageSection>

        {/* C) Derived */}
        <LineageSection
          title="Derived"
          defaultExpanded={autoExpandProvenance}
        >
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ledger day presence</Text>
            <Text style={styles.fieldValue}>
              {hasDerivedLedgerDay ? "Yes" : "No"}
            </Text>
            {lineageData.derivedLedgerRuns.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Runs</Text>
                <Text style={styles.fieldValue}>
                  {lineageData.derivedLedgerRuns
                    .map((r) => `${r.day} / ${r.runId}`)
                    .join("; ")}
                </Text>
                <Text style={styles.derivedHint}>
                  Endpoints: runs, replay, snapshot (Sprint 5)
                </Text>
              </>
            )}
          </View>
        </LineageSection>

        {/* D) Narrative */}
        <LineageSection
          title="Narrative"
          defaultExpanded={true}
        >
          <Text style={styles.narrative}>
            {buildNarrative(lineageData, canonicalEvent, hasDerivedLedgerDay)}
          </Text>
        </LineageSection>
      </ScrollView>
    </ScreenContainer>
  );
}

function buildNarrative(
  lineage: LineageResponseDto,
  canonicalEvent: { kind: string; day: string } | null,
  hasDerivedLedgerDay: boolean,
): string {
  const parts: string[] = [];
  if (canonicalEvent) {
    parts.push(
      `This canonical ${canonicalEvent.kind} event was created from ${lineage.rawEventIds.length} raw event(s).`,
    );
  } else {
    parts.push("Canonical event reference present.");
  }
  if (lineage.rawEventIds.length > 0) {
    parts.push(`Raw event IDs: ${lineage.rawEventIds.join(", ")}.`);
  }
  if (hasDerivedLedgerDay) {
    const days = lineage.derivedLedgerRuns.map((r: (typeof lineage.derivedLedgerRuns)[number]) => r.day);
    parts.push(`Derived ledger exists for day(s): ${days.join(", ")}.`);
  } else {
    parts.push("No derived ledger runs for this event.");
  }
  return parts.join(" ");
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  section: { marginTop: 20 },
  sectionToggle: {
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  sectionToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  sectionContent: { marginTop: 8 },
  card: {
    padding: 12,
    backgroundColor: "#F9F9FB",
    borderRadius: 12,
    gap: 8,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginTop: 8 },
  fieldValue: { fontSize: 15, color: "#1C1C1E", lineHeight: 20 },
  rawEventRow: { paddingVertical: 4 },
  rawEventId: { fontSize: 14, fontFamily: "monospace", color: "#1C1C1E" },
  derivedHint: { fontSize: 12, color: "#8E8E93", marginTop: 8 },
  narrative: {
    fontSize: 15,
    color: "#3C3C43",
    lineHeight: 22,
    padding: 12,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: "#3C3C43",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 22,
  },
  failureHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 8,
  },
});
