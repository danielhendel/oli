// app/(app)/body/weight.tsx — Weight Page v1: Hybrid (C), meaning first, logging second.
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState, EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightDeviceStatusCard } from "@/lib/ui/WeightDeviceStatusCard";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightInsightCard } from "@/lib/ui/WeightInsightCard";
import { WeightLogModal } from "@/lib/ui/WeightLogModal";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { useWeightSeries, type WeightRangeKey } from "@/lib/data/useWeightSeries";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

const LBS_PER_KG = 2.2046226218;

function formatWeight(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return unit === "lb" ? v.toFixed(1) : v.toFixed(1);
}

function formatDelta(kg: number): string {
  const abs = Math.abs(kg);
  const dir = kg < 0 ? "↓" : "↑";
  return `${dir} ${abs.toFixed(1)} this week`;
}

export default function BodyWeightScreen() {
  const { user, initializing } = useAuth();
  const { state: prefState } = usePreferences();
  const withingsPresence = useWithingsPresence();
  const [range, setRange] = useState<WeightRangeKey>("30D");
  const weightSeries = useWeightSeries(range);
  const [logModalVisible, setLogModalVisible] = useState(false);

  const unit = prefState.preferences?.units?.mass ?? "lb";
  const connected =
    withingsPresence.status === "ready" && withingsPresence.data?.connected;

  // Fail closed: auth
  if (initializing) {
    return (
      <ModuleScreenShell title="Weight" subtitle="Daily weigh-ins & trends">
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title="Weight" subtitle="Daily weigh-ins & trends">
        <EmptyState
          title="Sign in to view weight"
          description="Sign in to see your weight data and trends."
        />
      </ModuleScreenShell>
    );
  }

  // Weight series error (contract / network)
  if (weightSeries.status === "error") {
    return (
      <ModuleScreenShell title="Weight" subtitle="Daily weigh-ins & trends">
        <ErrorState
          message={weightSeries.error}
          requestId={weightSeries.requestId}
          onRetry={() => weightSeries.refetch()}
          isContractError={weightSeries.reason === "contract"}
        />
      </ModuleScreenShell>
    );
  }

  const data = weightSeries.status === "ready" ? weightSeries.data : null;
  const points = data?.points ?? [];
  const latest = data?.latest ?? null;
  const avg7Kg = data?.avg7Kg ?? null;
  const weeklyDeltaKg = data?.weeklyDeltaKg ?? null;
  const insights = data?.insights;

  return (
    <ModuleScreenShell title="Weight" subtitle="Daily weigh-ins & trends">
      {/* 1) Header: title + subtitle in shell */}

      {/* 2) Device Status Block */}
      <WeightDeviceStatusCard
        connected={connected}
        lastMeasurementAt={
          withingsPresence.status === "ready"
            ? withingsPresence.data?.lastMeasurementAt ?? null
            : null
        }
        {...(withingsPresence.status === "ready" && withingsPresence.data?.backfill != null
          ? { backfill: withingsPresence.data.backfill }
          : {})}
        onLogManually={() => setLogModalVisible(true)}
      />

      {/* 3) Current Snapshot */}
      <View style={styles.snapshotCard}>
        {latest ? (
          <>
            <Text style={styles.bigNumber}>
              {formatWeight(latest.weightKg, unit)}{" "}
              <Text style={styles.unitLabel}>{unit}</Text>
            </Text>
            {weeklyDeltaKg != null && (
              <Text style={styles.deltaLine}>{formatDelta(weeklyDeltaKg)}</Text>
            )}
            {avg7Kg != null && (
              <Text style={styles.avgLine}>
                7-day average: {formatWeight(avg7Kg, unit)} {unit}
              </Text>
            )}
            {weeklyDeltaKg == null && avg7Kg == null && (
              <Text style={styles.noTrend}>No recent trend yet</Text>
            )}
          </>
        ) : (
          <Text style={styles.noTrend}>No recent trend yet</Text>
        )}
      </View>

      {/* 4) Trend Chart — placeholder (no chart lib in package.json) */}
      <View style={styles.chartCard}>
        <WeightRangeSelector value={range} onChange={setRange} />
        {weightSeries.status === "partial" ? (
          <View style={styles.chartSkeleton}>
            <View style={styles.skeletonBar} />
            <View style={styles.skeletonBar} />
            <View style={styles.skeletonBar} />
          </View>
        ) : points.length === 0 ? (
          <EmptyState
            title="No weight data yet"
            description="Connect a scale or log your weight to see your trend."
            explanation="Chart will appear once data is available."
          />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              Chart will appear once data is available
            </Text>
          </View>
        )}
      </View>

      {/* 5) Trend Insights (collapsed by default) */}
      {insights && (
        <WeightInsightCard
          change30dKg={insights.change30dKg}
          weeklyRateKg={insights.weeklyRateKg}
          consistency={insights.consistency}
          volatilityKg={insights.volatilityKg}
          streakDays={insights.streakDays}
          trendNote={insights.trendNote}
        />
      )}

      {/* 6) Manual Log — contextual CTA */}
      <View style={styles.actions}>
        {connected ? (
          <Pressable
            onPress={() => setLogModalVisible(true)}
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Add manual entry"
          >
            <Text style={styles.secondaryButtonText}>Add manual entry</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setLogModalVisible(true)}
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel="Log your weight"
          >
            <Text style={styles.primaryButtonText}>Log your weight</Text>
          </Pressable>
        )}
      </View>

      {/* 7) Sources + Provenance (collapsed) */}
      {data && (
        <SourcesSection points={data.points} />
      )}

      <WeightLogModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSaved={() => {
          weightSeries.refetch();
          withingsPresence.refetch();
        }}
      />
    </ModuleScreenShell>
  );
}

function SourcesSection({
  points,
}: {
  points: { observedAt: string; weightKg: number; sourceId: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const sources = [...new Set(points.map((p) => p.sourceId))].filter(Boolean);
  const last5 = [...points]
    .sort(
      (a, b) =>
        new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
    )
    .slice(0, 5);

  const sourceLabel = (id: string) =>
    id === "withings" ? "Withings" : id === "manual" ? "Manual" : id;

  return (
    <View style={styles.sourcesCard}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.sourcesHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Data sources"
      >
        <Text style={styles.sourcesTitle}>
          Sources: {sources.map(sourceLabel).join(", ") || "—"}
        </Text>
        <Text style={styles.chevron}>{expanded ? "▼" : "▶"}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.sourcesBody}>
          {last5.map((p, i) => (
            <View key={i} style={styles.sourceRow}>
              <Text style={styles.sourceDate}>
                {new Date(p.observedAt).toLocaleString()}
              </Text>
              <Text style={styles.sourceValue}>{p.weightKg.toFixed(1)} kg</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{sourceLabel(p.sourceId)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  snapshotCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  bigNumber: { fontSize: 36, fontWeight: "800", color: "#1C1C1E" },
  unitLabel: { fontSize: 18, fontWeight: "600", color: "#6E6E73" },
  deltaLine: { fontSize: 14, color: "#3C3C43" },
  avgLine: { fontSize: 13, color: "#6E6E73" },
  noTrend: { fontSize: 13, color: "#6E6E73", fontStyle: "italic" },
  chartCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  chartSkeleton: {
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 12,
  },
  skeletonBar: {
    flex: 1,
    height: 40,
    backgroundColor: "#E5E5EA",
    borderRadius: 6,
  },
  chartPlaceholder: {
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  chartPlaceholderText: { fontSize: 13, color: "#6E6E73" },
  actions: { gap: 10 },
  primaryButton: {
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: "#E5E5EA",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#1C1C1E", fontSize: 15, fontWeight: "600" },
  sourcesCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  sourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourcesTitle: { fontSize: 14, fontWeight: "600", color: "#3C3C43" },
  chevron: { fontSize: 12, color: "#6E6E73" },
  sourcesBody: { gap: 8, marginTop: 4 },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  sourceDate: { fontSize: 12, color: "#6E6E73", flex: 1 },
  sourceValue: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  badge: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#3C3C43" },
});
