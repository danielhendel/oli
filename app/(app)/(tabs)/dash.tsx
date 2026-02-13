// app/(app)/(tabs)/dash.tsx
// Phase 1.5 Sprint 2 — Command Center: Health Score surface (read-only, trust-first)
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { BaselineDrawer } from "@/lib/ui/BaselineDrawer";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useTimeline } from "@/lib/data/useTimeline";
import { useHealthScore } from "@/lib/data/useHealthScore";
import {
  formatHealthScoreTier,
  formatHealthScoreStatus,
  formatMissingList,
} from "@/lib/format/healthScore";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useMemo, useState } from "react";
import type { HealthScoreDomainScores } from "@/lib/contracts";

function formatIsoToLocal(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString();
}

const DOMAIN_ORDER: (keyof HealthScoreDomainScores)[] = [
  "recovery",
  "training",
  "nutrition",
  "body",
];

const DOMAIN_LABELS: Record<keyof HealthScoreDomainScores, string> = {
  recovery: "Recovery",
  training: "Training",
  nutrition: "Nutrition",
  body: "Body",
};

function HealthScoreSection() {
  const todayKey = useMemo(() => getTodayDayKey(), []);
  const healthScore = useHealthScore(todayKey);
  const [baselineDrawerVisible, setBaselineDrawerVisible] = useState(false);

  if (healthScore.status === "partial") {
    return (
      <View style={styles.healthScoreSection}>
        <Text style={styles.healthScoreHeading}>Health Score</Text>
        <LoadingState message="Loading…" />
      </View>
    );
  }

  if (healthScore.status === "missing") {
    return (
      <View style={styles.healthScoreSection}>
        <Text style={styles.healthScoreHeading}>Health Score</Text>
        <EmptyState
          title="Health Score not available"
          description="No Health Score has been computed for this day."
          explanation="Health Score is derived server-side from available inputs."
        />
      </View>
    );
  }

  if (healthScore.status === "error") {
    const isOffline = healthScore.reason === "network";
    return (
      <View style={styles.healthScoreSection}>
        <Text style={styles.healthScoreHeading}>Health Score</Text>
        {isOffline ? (
          <View style={styles.stateContainer}>
            <Text style={styles.offlineTitle}>Offline</Text>
            <Text style={styles.offlineMessage}>
              Health Score will load when connection is restored.
            </Text>
          </View>
        ) : (
          <ErrorState
            message={healthScore.error}
            requestId={healthScore.requestId}
            onRetry={() => healthScore.refetch()}
            isContractError={healthScore.reason === "contract"}
          />
        )}
      </View>
    );
  }

  const d = healthScore.data;
  return (
    <View style={styles.healthScoreSection}>
      <Text style={styles.healthScoreHeading}>Health Score</Text>
      <View style={styles.compositeBlock}>
        <Text style={styles.compositeScore}>{d.compositeScore}</Text>
        <Text style={styles.compositeTier}>{formatHealthScoreTier(d.compositeTier)}</Text>
      </View>
      <Text style={styles.statusLine}>Status: {formatHealthScoreStatus(d.status)}</Text>
      <View style={styles.domainList}>
        {DOMAIN_ORDER.map((key) => {
          const domain = d.domainScores[key];
          const missingStr = formatMissingList(domain.missing);
          return (
            <View key={key} style={styles.domainRow}>
              <View style={styles.domainRowMain}>
                <Text style={styles.domainLabel}>{DOMAIN_LABELS[key]}</Text>
                <Text style={styles.domainValue}>
                  {domain.score} — {formatHealthScoreTier(domain.tier)}
                </Text>
              </View>
              {missingStr ? (
                <Text style={styles.domainMissing}>{missingStr}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.metadata}>
        <Text style={styles.metadataText}>
          Model {d.modelVersion} · Computed {formatIsoToLocal(d.computedAt)}
        </Text>
      </View>
      <Pressable
        style={styles.baselineTrigger}
        onPress={() => setBaselineDrawerVisible(true)}
      >
        <Text style={styles.link}>View baselines</Text>
      </Pressable>
      <BaselineDrawer
        visible={baselineDrawerVisible}
        onClose={() => setBaselineDrawerVisible(false)}
        doc={d}
      />
    </View>
  );
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

        <HealthScoreSection />

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
  healthScoreSection: {
    marginTop: 24,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  healthScoreHeading: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  compositeBlock: {
    alignItems: "center",
    paddingVertical: 8,
  },
  compositeScore: { fontSize: 48, fontWeight: "900", color: "#1C1C1E" },
  compositeTier: { fontSize: 20, fontWeight: "600", color: "#3C3C43", marginTop: 4 },
  statusLine: { fontSize: 15, color: "#3C3C43" },
  domainList: { gap: 8 },
  domainRow: { gap: 2 },
  domainRowMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  domainLabel: { fontSize: 15, color: "#3C3C43" },
  domainValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  domainMissing: { fontSize: 12, color: "#8E8E93", marginLeft: 0 },
  metadata: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#C6C6C8" },
  metadataText: { fontSize: 12, color: "#8E8E93" },
  baselineTrigger: { marginTop: 8 },
  stateContainer: {
    padding: 24,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  offlineMessage: { fontSize: 15, color: "#8E8E93", textAlign: "center" },
  actions: { marginTop: 24, gap: 12 },
  link: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
});
