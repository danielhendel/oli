import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ScreenContainer, EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { formatBodyDayLabel } from "@/lib/ui/body/formatBodyDayLabel";
import {
  formatBodyBmi,
  formatBodyLeanMass,
  formatBodyRmr,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";
import { BODY_METRIC_DETAIL_DEFAULT_RANGE } from "@/lib/data/body/bodyMetricDetailDefaults";
import { useBodyMetricTrends, type BodyTrendMetric } from "@/lib/data/body/useBodyMetricTrends";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

const PARAM_TO_METRIC: Record<string, BodyTrendMetric> = {
  weight: "weight",
  "body-fat": "body_fat_percent",
  bmi: "bmi",
  "lean-mass": "lean_body_mass",
  rmr: "resting_metabolic_rate",
};

const METRIC_TITLES: Record<BodyTrendMetric, string> = {
  weight: "Weight",
  body_fat_percent: "Body Fat",
  bmi: "BMI",
  lean_body_mass: "Lean Body Mass",
  resting_metabolic_rate: "RMR",
};

function latestPoint(points: WeightPoint[]): WeightPoint | null {
  if (points.length === 0) return null;
  return [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt))[points.length - 1] ?? null;
}

export default function BodyMetricDetailScreen() {
  const { metric: metricParam } = useLocalSearchParams<{ metric: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";
  const [range, setRange] = useState<WeightRangeKey>(BODY_METRIC_DETAIL_DEFAULT_RANGE);

  const metric = typeof metricParam === "string" ? PARAM_TO_METRIC[metricParam] : undefined;

  const trends = useBodyMetricTrends(range, metric, { enabled: metric !== undefined });

  useEffect(() => {
    if (!metric) return;
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: METRIC_TITLES[metric],
    });
  }, [navigation, metric]);

  const points = useMemo(() => {
    if (trends.status !== "ready" || !metric) return [];
    return trends.data.byMetric[metric];
  }, [trends, metric]);

  const stats = useMemo(() => {
    if (trends.status !== "ready" || !metric) {
      return { change: null, avg: null, high: null, low: null };
    }
    return trends.data.statsByMetric[metric];
  }, [trends, metric]);

  const formatTrendValue = (value: number): string => {
    if (!metric) return String(value);
    if (metric === "weight") return formatBodyWeight(value, unit);
    if (metric === "body_fat_percent") return `${value.toFixed(1)}%`;
    if (metric === "bmi") return formatBodyBmi(value);
    if (metric === "lean_body_mass") return formatBodyLeanMass(value, unit);
    return formatBodyRmr(value);
  };

  const chartUnitLabel = (): string => {
    if (!metric) return "";
    if (metric === "weight" || metric === "lean_body_mass") return unit;
    if (metric === "body_fat_percent") return "%";
    if (metric === "resting_metabolic_rate") return "kcal";
    return "";
  };

  const historyRows = useMemo(() => {
    return [...points].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }, [points]);

  if (!metric) {
    return (
      <ScreenContainer>
        <ErrorState message="Unknown metric" />
      </ScreenContainer>
    );
  }

  const hero = latestPoint(points);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Latest</Text>
          {trends.status === "partial" ? (
            <LoadingState message="Loading…" />
          ) : trends.status === "error" ? (
            <ErrorState message={trends.error} requestId={trends.requestId} onRetry={() => trends.refetch()} />
          ) : hero == null ? (
            <Text style={styles.heroEmpty}>—</Text>
          ) : (
            <>
              <Text style={styles.heroValue}>{formatTrendValue(hero.weightKg)}</Text>
              <Text style={styles.heroSub}>{formatBodyDayLabel(hero.dayKey)}</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <WeightRangeSelector value={range} onChange={setRange} />
          {trends.status === "partial" ? (
            <LoadingState message="Loading chart…" />
          ) : trends.status === "error" ? (
            <ErrorState message={trends.error} requestId={trends.requestId} onRetry={() => trends.refetch()} />
          ) : points.length === 0 ? (
            <EmptyState title="No trend data yet" description="Try a longer range or sync Apple Health body data." />
          ) : (
            <View style={styles.chartContainer}>
              <WeightTrendChart
                points={points}
                unitLabel={chartUnitLabel()}
                valueKind={metric === "weight" || metric === "lean_body_mass" ? "mass" : "generic"}
                formatValue={(v) => {
                  const label = formatTrendValue(v);
                  const suffix = chartUnitLabel();
                  return suffix ? label.replace(` ${suffix}`, "") : label;
                }}
                range={range}
                accentColor={BODY_INDIGO}
              />
            </View>
          )}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              Change {stats.change != null ? formatTrendValue(stats.change) : "—"}
            </Text>
            <Text style={styles.statText}>Avg {stats.avg != null ? formatTrendValue(stats.avg) : "—"}</Text>
            <Text style={styles.statText}>High {stats.high != null ? formatTrendValue(stats.high) : "—"}</Text>
            <Text style={styles.statText}>Low {stats.low != null ? formatTrendValue(stats.low) : "—"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>History</Text>
          {trends.status !== "ready" || historyRows.length === 0 ? (
            <Text style={styles.placeholder}>No entries in this range</Text>
          ) : (
            historyRows.map((p) => (
              <Pressable
                key={`${p.observedAt}-${p.dayKey}-${p.sourceId}`}
                style={({ pressed }) => [styles.historyRow, pressed && styles.historyRowPressed]}
                onPress={() => router.push({ pathname: "/(app)/body/day/[day]", params: { day: p.dayKey } })}
                accessibilityRole="button"
                accessibilityLabel={`Open body day ${p.dayKey}`}
              >
                <Text style={styles.historyDate}>{formatBodyDayLabel(p.dayKey)}</Text>
                <Text style={styles.historyValue}>{formatTrendValue(p.weightKg)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 16, backgroundColor: "#F2F2F7" },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  heroLabel: { fontSize: 14, fontWeight: "600", color: "#6E6E73" },
  heroValue: { fontSize: 34, fontWeight: "700", color: "#1C1C1E" },
  heroSub: { fontSize: 15, fontWeight: "500", color: "#3C3C43" },
  heroEmpty: { fontSize: 28, fontWeight: "600", color: "#AEAEB2" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  chartContainer: { height: 200, width: "100%" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statText: { fontSize: 13, color: "#3C3C43", fontWeight: "600" },
  placeholder: { fontSize: 15, color: "#8E8E93" },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  historyRowPressed: { opacity: 0.7 },
  historyDate: { fontSize: 14, fontWeight: "500", color: "#6E6E73" },
  historyValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
});
