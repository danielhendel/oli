import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useReadinessView } from "@/lib/data/useReadinessView";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { deriveOuraImportState } from "@/lib/integrations/oura/importState";
import { RecoveryScoreCard } from "@/lib/ui/recovery/RecoveryScoreCard";
import {
  RecoveryContributorsCard,
  type ContributorRowProps,
} from "@/lib/ui/recovery/RecoveryContributorsCard";
import {
  scoreToRatingLabel,
  contributorValueToProgress,
  contributorValueToRatingLabel,
  formatContributorDisplayValue,
  READINESS_CONTRIBUTOR_KEYS,
} from "@/lib/format/ouraScore";

function toTodayYmd(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD as "Mar 13" for fallback banner. */
function formatResolvedDay(day: string): string {
  try {
    const d = new Date(day + "T12:00:00.000Z");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const date = d.getUTCDate();
    return `${month} ${date}`;
  } catch {
    return day;
  }
}

export default function ReadinessScreen() {
  const day = useMemo(() => toTodayYmd(), []);
  const { refetch, ...readinessState } = useReadinessView(day);
  const ouraPresence = useOuraPresence();

  useFocusEffect(
    useCallback(() => {
      refetch({ cacheBust: `readiness:${Date.now()}` });
    }, [refetch]),
  );

  if (readinessState.status === "partial") {
    return (
      <ModuleScreenShell title="Readiness" hideTitleChrome>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading readiness data…</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  if (readinessState.status === "missing") {
    const ouraConnected =
      ouraPresence.status === "ready" && ouraPresence.data.connected;
    const importState = ouraConnected
      ? deriveOuraImportState({
          connected: ouraPresence.data.connected,
          lastSnapshotAt: ouraPresence.data.lastSnapshotAt,
          backfillStatus: ouraPresence.data.backfillStatus,
        })
      : null;
    let subtitle2: string;
    if (importState === "running") {
      subtitle2 = "Oura history is importing. Data should appear when import completes.";
    } else if (importState === "failed") {
      subtitle2 = "Oura import failed. Pull to refresh and try again.";
    } else if (importState === "connected_no_data" || importState === "ready") {
      subtitle2 =
        "Oura is connected, but recent readiness data has not been imported yet.";
    } else {
      subtitle2 =
        "Connect Oura in Settings → Devices and sync to see your readiness score and contributors here.";
    }
    return (
      <ModuleScreenShell title="Readiness" hideTitleChrome>
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No readiness data in the last 7 days</Text>
          <Text style={styles.emptySubtitle}>{subtitle2}</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  if (readinessState.status === "error") {
    return (
      <ModuleScreenShell title="Readiness" hideTitleChrome>
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>Could not load readiness data. Try again later.</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  if (readinessState.status !== "ready") {
    return (
      <ModuleScreenShell title="Readiness" hideTitleChrome>
        <View style={styles.messageCard}>
          <Text style={styles.emptySubtitle}>No readiness data available.</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  const view = readinessState.data;
  const score = view.score ?? null;
  const contributors =
    view.contributors && typeof view.contributors === "object"
      ? (view.contributors as Record<string, unknown>)
      : {};

  const contributorRows: ContributorRowProps[] = READINESS_CONTRIBUTOR_KEYS.map(({ key, label }) => {
    const value = contributors[key];
    const displayValue = formatContributorDisplayValue(key, value);
    const progress = contributorValueToProgress(value);
    const rating = contributorValueToRatingLabel(value);
    return { label, valueDisplay: displayValue, progress, rating };
  });

  const fallbackMessage = view.isFallback
    ? `Showing latest available Oura readiness for ${formatResolvedDay(view.resolvedDay)}`
    : null;

  return (
    <ModuleScreenShell title="Readiness" hideTitleChrome>
      <View style={styles.content}>
        <RecoveryScoreCard
          score={score}
          ratingLabel={score != null ? scoreToRatingLabel(score) : null}
          fallbackMessage={fallbackMessage}
        />
        <RecoveryContributorsCard rows={contributorRows} />
        {score == null && Object.keys(contributors).length === 0 && (
          <View style={styles.messageCard}>
            <Text style={styles.emptySubtitle}>No readiness metrics for this day.</Text>
          </View>
        )}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: "#F2F2F7",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
    backgroundColor: "#F2F2F7",
  },
  loadingText: { fontSize: 16, color: "#6E6E73" },
  messageCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: "#6E6E73", lineHeight: 22 },
  errorText: { fontSize: 15, color: "#6E6E73" },
});
