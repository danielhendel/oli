// app/(app)/(tabs)/library/replay/day/[dayKey].tsx
// Sprint 5 — Replay & "As-Of" Time Travel UI
// User can replay past truth for a given day; powered by GET /users/me/derived-ledger/snapshot

import { ScrollView, View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useDerivedLedgerRuns } from "@/lib/data/useDerivedLedgerRuns";
import { useDerivedLedgerSnapshot } from "@/lib/data/useDerivedLedgerSnapshot";
import { useMemo, useState, useEffect } from "react";
import type { DerivedLedgerRunSummaryDto, DerivedLedgerReplayResponseDto } from "@/lib/contracts/derivedLedger";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

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

function ReplaySection({ title, children, defaultExpanded = false }: SectionProps) {
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

const REPLAY_EXPLANATION = `Replay lets you view the derived truth for a day as it was stored at a specific point in time.

Each "run" represents a computation that produced daily facts, intelligence context, and insights. Past views never change—determinism is preserved.

This supports auditability: you can see exactly what Oli knew, and when.`;

export default function ReplayDayScreen() {
  const params = useLocalSearchParams<{ dayKey: string }>();
  const router = useRouter();
  const dayParam = params.dayKey ?? "";
  const day = YYYY_MM_DD.test(dayParam) ? dayParam : "";

  const [whatIsModalVisible, setWhatIsModalVisible] = useState(false);
  const [asOfInput, setAsOfInput] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runs = useDerivedLedgerRuns(day, { enabled: !!day });
  const asOfIso = useMemo(() => {
    if (!asOfInput.trim()) return undefined;
    const d = new Date(asOfInput.trim());
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }, [asOfInput]);

  const runsData = runs.status === "ready" ? runs.data : null;
  const snapshotArgs = useMemo(
    () => {
      const runId = asOfIso
        ? undefined
        : (selectedRunId ?? runsData?.latestRunId ?? runsData?.runs[0]?.runId ?? undefined);
      return {
        day,
        ...(runId !== undefined ? { runId } : {}),
        ...(asOfIso ? { asOf: asOfIso } : {}),
      };
    },
    [day, selectedRunId, runsData?.latestRunId, runsData?.runs, asOfIso],
  );

  const snapshot = useDerivedLedgerSnapshot(snapshotArgs, {
    enabled: !!day && (!!snapshotArgs.runId || !!snapshotArgs.asOf),
  });

  const effectiveComputedAt = useMemo(() => {
    if (snapshot.status === "ready") return snapshot.data.computedAt;
    return null;
  }, [snapshot]);

  const bannerMode = useMemo(() => {
    if (asOfIso) return { type: "asOf" as const, value: asOfIso };
    if (effectiveComputedAt) return { type: "run" as const, value: effectiveComputedAt };
    return null;
  }, [asOfIso, effectiveComputedAt]);

  const isContractError =
    (runs.status === "error" && (runs.error?.toLowerCase().includes("invalid") ?? false)) ||
    (snapshot.status === "error" && (snapshot.error?.toLowerCase().includes("invalid") ?? false));

  if (!day) {
    return (
      <ScreenContainer>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  if (runs.status === "error" && isContractError) {
    return (
      <ScreenContainer>
        <ErrorState
          message={runs.error}
          requestId={runs.requestId}
          onRetry={() => runs.refetch()}
          isContractError={true}
        />
      </ScreenContainer>
    );
  }

  if (snapshot.status === "error" && isContractError) {
    return (
      <ScreenContainer>
        <ErrorState
          message={snapshot.error}
          requestId={snapshot.requestId}
          onRetry={() => snapshot.refetch()}
          isContractError={true}
        />
      </ScreenContainer>
    );
  }

  if (runs.status === "loading") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading runs…" />
      </ScreenContainer>
    );
  }

  if (runsData && runsData.runs.length === 0 && !asOfIso) {
    return (
      <ScreenContainer>
        <EmptyState
          title="No derived runs"
          description="No computed runs exist for this day. Derived truth will appear after the pipeline runs."
        />
      </ScreenContainer>
    );
  }

  const defaultRunId = runsData ? (runsData.latestRunId ?? runsData.runs[0]?.runId) : null;
  useEffect(() => {
    if (runs.status === "ready" && !selectedRunId && !asOfIso && defaultRunId) {
      setSelectedRunId(defaultRunId);
    }
  }, [runs.status, runsData?.latestRunId, runsData?.runs, selectedRunId, asOfIso, defaultRunId]);

  if (snapshot.status === "loading") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading snapshot…" />
      </ScreenContainer>
    );
  }

  if (snapshot.status === "error" && !isContractError) {
    return (
      <ScreenContainer>
        <ErrorState
          message={snapshot.error}
          requestId={snapshot.requestId}
          onRetry={() => snapshot.refetch()}
        />
      </ScreenContainer>
    );
  }

  const snapshotData = snapshot.status === "ready" ? snapshot.data : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Replay</Text>
        <Text style={styles.subtitle}>{day}</Text>

        {bannerMode && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Viewing past truth{" "}
              {bannerMode.type === "run"
                ? `as of ${formatIso(bannerMode.value)}`
                : `as of ${formatIso(bannerMode.value)}`}
            </Text>
          </View>
        )}

        <Pressable style={styles.whatIsLink} onPress={() => setWhatIsModalVisible(true)}>
          <Text style={styles.whatIsLinkText}>What is this?</Text>
        </Pressable>

        <Modal
          visible={whatIsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setWhatIsModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setWhatIsModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>What is Replay?</Text>
              <Text style={styles.modalBody}>{REPLAY_EXPLANATION}</Text>
              <Pressable style={styles.modalClose} onPress={() => setWhatIsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {runsData && (
          <View style={styles.runSelector}>
            <Text style={styles.sectionTitle}>Run</Text>
            {runsData.runs.map((r) => (
              <RunRow
                key={r.runId}
                run={r}
                selected={selectedRunId === r.runId && !asOfIso}
                onSelect={() => {
                  setSelectedRunId(r.runId);
                  setAsOfInput("");
                }}
              />
            ))}
          </View>
        )}

        <View style={styles.asOfSection}>
          <Text style={styles.sectionTitle}>As-of time (optional)</Text>
          <Text style={styles.asOfHint}>
            Enter ISO 8601 timestamp to view truth as of that moment. API supports asOf.
          </Text>
          <TextInput
            style={styles.asOfInput}
            value={asOfInput}
            onChangeText={setAsOfInput}
            placeholder="e.g. 2026-02-08T12:00:00Z"
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {snapshotData && (
          <ReplayContent data={snapshotData} />
        )}

        <ReplaySection title="Provenance" defaultExpanded={false}>
          <View style={styles.card}>
            {snapshotData && (
              <>
                <Text style={styles.fieldLabel}>runId</Text>
                <Text style={styles.fieldValue}>{snapshotData.runId}</Text>
                <Text style={styles.fieldLabel}>computedAt</Text>
                <Text style={styles.fieldValue}>{snapshotData.computedAt}</Text>
                <Text style={styles.fieldLabel}>Snapshot day</Text>
                <Text style={styles.fieldValue}>{snapshotData.day}</Text>
                <Text style={styles.fieldLabel}>Endpoints used</Text>
                <Text style={styles.fieldValue}>runs, snapshot</Text>
              </>
            )}
          </View>
        </ReplaySection>

        <Pressable
          style={styles.viewCurrentLink}
          onPress={() => router.push(`/(app)/(tabs)/timeline/${day}`)}
        >
          <Text style={styles.viewCurrentLinkText}>View current truth</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function RunRow({
  run,
  selected,
  onSelect,
}: {
  run: DerivedLedgerRunSummaryDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      style={[styles.runRow, selected && styles.runRowSelected]}
      onPress={onSelect}
    >
      <Text style={styles.runRowTime}>{formatIso(run.computedAt)}</Text>
      <Text style={styles.runRowId}>{run.runId}</Text>
    </Pressable>
  );
}

function ReplayContent({ data }: { data: DerivedLedgerReplayResponseDto }) {
  return (
    <View style={styles.contentSection}>
      <Text style={styles.sectionTitle}>Derived truth</Text>
      <View style={styles.card}>
        {data.dailyFacts && (
          <View style={styles.summaryRow}>
            <Text style={styles.fieldLabel}>Daily facts</Text>
            <Text style={styles.fieldValue}>Present</Text>
          </View>
        )}
        {data.intelligenceContext && (
          <View style={styles.summaryRow}>
            <Text style={styles.fieldLabel}>Intelligence context</Text>
            <Text style={styles.fieldValue}>Present</Text>
          </View>
        )}
        {data.insights && (
          <View style={styles.summaryRow}>
            <Text style={styles.fieldLabel}>Insights</Text>
            <Text style={styles.fieldValue}>{data.insights.count} item(s)</Text>
          </View>
        )}
        {!data.dailyFacts && !data.intelligenceContext && !data.insights && (
          <Text style={styles.fieldValue}>No derived snapshots in this run</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  banner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  whatIsLink: {
    marginTop: 12,
  },
  whatIsLinkText: {
    fontSize: 15,
    color: "#007AFF",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    color: "#3C3C43",
    lineHeight: 22,
  },
  modalClose: {
    marginTop: 20,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  runSelector: { marginTop: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  runRow: {
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    marginBottom: 6,
  },
  runRowSelected: {
    backgroundColor: "#E8F4FD",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  runRowTime: { fontSize: 15, color: "#1C1C1E" },
  runRowId: { fontSize: 12, color: "#8E8E93", marginTop: 4, fontFamily: "monospace" },
  asOfSection: { marginTop: 20 },
  asOfHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 8,
  },
  asOfInput: {
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    fontSize: 15,
    color: "#1C1C1E",
  },
  contentSection: { marginTop: 24 },
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
  summaryRow: { marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginTop: 8 },
  fieldValue: { fontSize: 15, color: "#1C1C1E", lineHeight: 20 },
  viewCurrentLink: {
    marginTop: 24,
    padding: 12,
    alignItems: "center",
  },
  viewCurrentLinkText: {
    fontSize: 15,
    color: "#007AFF",
    textDecorationLine: "underline",
  },
});
