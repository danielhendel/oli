// app/(app)/body/weight.tsx — Body Composition: nav header, hero, stat tiles, chart (fail-closed).
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from "react-native";
import { useNavigation } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState, EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightDeviceStatusCard } from "@/lib/ui/WeightDeviceStatusCard";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";
import { WeightLogModal } from "@/lib/ui/WeightLogModal";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { useWeightSeries, type WeightRangeKey, type WeightPoint } from "@/lib/data/useWeightSeries";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

const CHART_CONTAINER_HEIGHT = 200;
const SURFACE_FILL = "#E5E5EA";
const SURFACE_RADIUS = 14;

const LBS_PER_KG = 2.2046226218;
const SHELL_TITLE = "Body Composition";
const SHELL_SUBTITLE = "Daily weigh-ins & trends";

function formatWeight(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return unit === "lb" ? v.toFixed(1) : v.toFixed(1);
}

function getRangeLabel(range: WeightRangeKey): string {
  switch (range) {
    case "7D":
      return "7-day";
    case "30D":
      return "30-day";
    case "90D":
      return "90-day";
    case "1Y":
      return "12-month";
    case "All":
      return "all-time";
    default:
      return "30-day";
  }
}

/** Display-only source labels; never show tokens or secrets. */
function sourceLabel(sourceId: string): string {
  if (sourceId === "withings") return "Withings";
  if (sourceId === "manual") return "Manual";
  if (typeof sourceId === "string" && sourceId.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(sourceId))
    return sourceId;
  return "—";
}

/** Derive YYYY-MM-DD in local timezone from ISO string (for metadata display). */
function dayKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

type RangeStats = {
  changeKg: number | null;
  avgKg: number | null;
  highKg: number | null;
  lowKg: number | null;
};

/**
 * Range-based stats from points only (no smoothing). Earliest = first by dayKey ascending.
 * Change = latest weight − earliest weight in range.
 */
function computeRangeStats(
  points: WeightPoint[],
  latest: { weightKg: number; observedAt: string; sourceId: string } | null,
): RangeStats | null {
  if (points.length === 0) return null;
  const sortedByDay = [...points].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  const earliest = sortedByDay[0]!;
  const changeKg = latest ? latest.weightKg - earliest.weightKg : null;
  const sum = points.reduce((s, p) => s + p.weightKg, 0);
  const avgKg = sum / points.length;
  const weights = points.map((p) => p.weightKg);
  const highKg = Math.max(...weights);
  const lowKg = Math.min(...weights);
  return { changeKg, avgKg, highKg, lowKg };
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={styles.statTileValue}>{value}</Text>
    </View>
  );
}

export default function BodyWeightScreen() {
  const { user, initializing } = useAuth();
  const { state: prefState } = usePreferences();
  const withingsPresence = useWithingsPresence();
  const [range, setRange] = useState<WeightRangeKey>("30D");
  const weightSeries = useWeightSeries(range);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setSettingsModalVisible(true)}
          style={styles.headerMenuBtn}
          accessibilityRole="button"
          accessibilityLabel="Weight settings"
        >
          <Text style={styles.headerMenuText}>•••</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const unit = prefState.preferences?.units?.mass ?? "lb";
  const connected =
    withingsPresence.status === "ready" && withingsPresence.data?.connected;

  // Fail closed: auth
  if (initializing) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
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
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
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

  useEffect(() => {
    if (points.length > 0) setChartError(null);
  }, [points.length]);

  // Fail closed: contract violation (latest without points)
  if (latest != null && points.length === 0) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <ErrorState
          title="Data error"
          message="Weight data is inconsistent. Please try again."
          onRetry={() => weightSeries.refetch()}
        />
      </ModuleScreenShell>
    );
  }

  const rangeLabel = getRangeLabel(range);
  const rangeStats = computeRangeStats(points, latest);

  return (
    <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
      {/* 1) Metric label + Hero */}
      <Text style={styles.metricLabel}>Weight</Text>
      <View style={styles.heroCard}>
        <View style={styles.heroGrid}>
          <View style={styles.heroLeft}>
            <Text style={styles.bigNumber}>
              {latest != null
                ? `${formatWeight(latest.weightKg, unit)} `
                : "— "}
              <Text style={styles.unitLabel}>{unit}</Text>
            </Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.lastLoggedLabel}>Last logged</Text>
            {latest != null ? (
              <>
                <Text style={styles.lastLoggedValue}>
                  {new Date(latest.observedAt).toLocaleString()}
                </Text>
                <Pressable
                  onPress={() => setDetailsModalVisible(true)}
                  style={styles.sourceLink}
                  accessibilityRole="button"
                  accessibilityLabel={`Source: ${sourceLabel(latest.sourceId)}`}
                >
                  <Text style={styles.sourceLinkText}>
                    {sourceLabel(latest.sourceId)}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.lastLoggedValue}>—</Text>
            )}
          </View>
        </View>
      </View>

      {/* 2) Range selector + Chart */}
      <View style={styles.chartCard}>
        <WeightRangeSelector value={range} onChange={setRange} />
        {weightSeries.status === "partial" ? (
          <View style={[styles.chartContainer, styles.chartSkeleton]}>
            <View style={styles.skeletonBar} />
            <View style={styles.skeletonBar} />
            <View style={styles.skeletonBar} />
          </View>
        ) : points.length === 0 ? (
          <EmptyState
            title="No weight data yet"
            description="Connect a scale or log your weight to see your trend."
            explanation="Your chart will appear after your first weigh-in."
          />
        ) : chartError ? (
          <ErrorState
            title="Chart error"
            message={chartError}
            onRetry={() => {
              setChartError(null);
              weightSeries.refetch();
            }}
          />
        ) : (
          <View style={styles.chartContainer} testID="weight-trend-chart">
            <WeightTrendChart
              points={points}
              unitLabel={unit}
              formatValue={(kg) => formatWeight(kg, unit)}
              onChartError={setChartError}
            />
          </View>
        )}
      </View>

      {/* 3) Stat tiles (range-based) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statTilesScroll}
        style={styles.statTilesScrollView}
      >
        <StatTile
          label={`${rangeLabel} change`}
          value={
            rangeStats?.changeKg != null
              ? `${rangeStats.changeKg >= 0 ? "+" : ""}${formatWeight(rangeStats.changeKg, unit)} ${unit}`
              : "—"
          }
        />
        <StatTile
          label={`${rangeLabel} avg`}
          value={
            rangeStats?.avgKg != null
              ? `${formatWeight(rangeStats.avgKg, unit)} ${unit}`
              : "—"
          }
        />
        <StatTile
          label="High"
          value={rangeStats?.highKg != null ? `${formatWeight(rangeStats.highKg, unit)} ${unit}` : "—"}
        />
        <StatTile
          label="Low"
          value={rangeStats?.lowKg != null ? `${formatWeight(rangeStats.lowKg, unit)} ${unit}` : "—"}
        />
      </ScrollView>

      {/* 4) Manual Log CTA — hidden when Withings connected */}
      {!connected && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => setLogModalVisible(true)}
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel="Log your weight"
          >
            <Text style={styles.primaryButtonText}>Log your weight</Text>
          </Pressable>
        </View>
      )}

      {/* 5) Sources & Devices (grouped at bottom) */}
      <Text style={styles.sectionLabel}>Sources & Devices</Text>
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
      {data && (
        <SourcesSection points={data.points} hideManualInSummary={connected} />
      )}

      <WeightLogModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSaved={() => {
          weightSeries.refetch();
          withingsPresence.refetch();
        }}
      />

      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsModalVisible(false)}
        accessibilityLabel="Weight settings"
      >
        <Pressable
          style={styles.settingsModalBackdrop}
          onPress={() => setSettingsModalVisible(false)}
          accessibilityLabel="Close"
        >
          <View style={styles.settingsModalContent}>
            <Text style={styles.settingsModalTitle}>Weight settings coming soon</Text>
            <Pressable
              onPress={() => setSettingsModalVisible(false)}
              style={styles.detailsCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailsModalVisible(false)}
        accessibilityLabel="Measurement Details"
      >
        <View style={styles.detailsSheet}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Measurement Details</Text>
            <Pressable
              onPress={() => setDetailsModalVisible(false)}
              style={styles.detailsCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>
          </View>
          {latest != null && (
            <View style={styles.detailsBody}>
              <Text style={styles.detailsValue}>
                {formatWeight(latest.weightKg, unit)} {unit}
              </Text>
              <Text style={styles.detailsDatetime}>
                {new Date(latest.observedAt).toLocaleString()}
              </Text>
              <Text style={styles.detailsSource}>
                {sourceLabel(latest.sourceId)}
              </Text>
              <View style={styles.detailsMeta}>
                <Text style={styles.detailsMetaLabel}>observedAt</Text>
                <Text style={styles.detailsMetaValue}>{latest.observedAt}</Text>
                <Text style={styles.detailsMetaLabel}>dayKey</Text>
                <Text style={styles.detailsMetaValue}>
                  {dayKeyFromIso(latest.observedAt)}
                </Text>
                <Text style={styles.detailsMetaLabel}>sourceId</Text>
                <Text style={styles.detailsMetaValue}>{latest.sourceId}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </ModuleScreenShell>
  );
}

function SourcesSection({
  points,
  hideManualInSummary = false,
}: {
  points: { observedAt: string; weightKg: number; sourceId: string }[];
  /** When true (e.g. Withings connected), show only Withings in summary row (UI-only). */
  hideManualInSummary?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sources = [...new Set(points.map((p) => p.sourceId))].filter(Boolean);
  const displaySources = hideManualInSummary ? sources.filter((id) => id === "withings") : sources;
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
          Sources: {displaySources.map(sourceLabel).join(", ") || "—"}
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
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6E6E73",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6E6E73",
    marginTop: 20,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroCard: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    padding: 20,
    gap: 12,
  },
  heroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  heroLeft: { flex: 1, minWidth: 0, justifyContent: "center" },
  heroRight: { minWidth: 0, alignItems: "flex-end", gap: 2 },
  bigNumber: { fontSize: 36, fontWeight: "800", color: "#1C1C1E" },
  unitLabel: { fontSize: 18, fontWeight: "600", color: "#6E6E73" },
  lastLoggedLabel: { fontSize: 12, fontWeight: "600", color: "#6E6E73" },
  lastLoggedValue: { fontSize: 13, color: "#3C3C43" },
  sourceLink: { alignSelf: "flex-end", paddingVertical: 4, paddingRight: 0 },
  sourceLinkText: { fontSize: 13, fontWeight: "600", color: "#007AFF" },
  headerMenuBtn: { padding: 12 },
  headerMenuText: { fontSize: 18, color: "#1C1C1E", fontWeight: "700" },
  statTilesScrollView: { marginHorizontal: -16 },
  statTilesScroll: { paddingHorizontal: 16, gap: 12, paddingVertical: 4 },
  statTile: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 100,
  },
  statTileLabel: { fontSize: 12, color: "#6E6E73", marginBottom: 4 },
  statTileValue: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  chartCard: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    padding: 16,
    gap: 12,
  },
  chartContainer: {
    height: CHART_CONTAINER_HEIGHT,
    width: "100%",
  },
  chartSkeleton: {
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
  actions: { gap: 10 },
  primaryButton: {
    backgroundColor: "#1C1C1E",
    borderRadius: SURFACE_RADIUS,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#1C1C1E", fontSize: 15, fontWeight: "600" },
  sourcesCard: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
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
  detailsSheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  detailsTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },
  detailsCloseBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  detailsCloseText: { fontSize: 17, fontWeight: "600", color: "#007AFF" },
  detailsBody: { gap: 8 },
  detailsValue: { fontSize: 28, fontWeight: "800", color: "#1C1C1E" },
  detailsDatetime: { fontSize: 15, color: "#3C3C43" },
  detailsSource: { fontSize: 15, fontWeight: "600", color: "#6E6E73" },
  detailsMeta: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E5EA", gap: 6 },
  detailsMetaLabel: { fontSize: 12, fontWeight: "600", color: "#6E6E73" },
  detailsMetaValue: { fontSize: 12, color: "#3C3C43", fontFamily: "monospace" },
  settingsModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  settingsModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
  },
  settingsModalTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E", textAlign: "center" },
});
