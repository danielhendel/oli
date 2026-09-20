import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import {
  bodyHistoryCalendarAccessibilityLabel,
  bodyHistoryCalendarHref,
  bodyHistoryListAccessibilityLabel,
  bodyHistoryListHref,
  bodyHistoryMetricFromDetailParam,
  bodyMetricDetailBackAccessibilityLabel,
  type BodyHistoryMetricFilter,
} from "@/lib/data/body/bodyHistoryMetricFilter";
import { BODY_METRIC_DETAIL_DEFAULT_RANGE } from "@/lib/data/body/bodyMetricDetailDefaults";
import { useBodyMetricTrends, type BodyTrendMetric } from "@/lib/data/body/useBodyMetricTrends";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import { resolveBodyMetricEducationalReferencePresentation } from "@/lib/body/standards/resolveEducationalReferencePresentation";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { BodyMetricDetailEducationPanel } from "@/lib/ui/body/BodyMetricDetailEducationPanel";
import {
  formatBodyBmi,
  formatBodyLeanMass,
  formatBodyRmr,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";
import { formatBodyDayLabel } from "@/lib/ui/body/formatBodyDayLabel";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ScreenContainer, EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";
import { UI_CARD_SURFACE, UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

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
  lean_body_mass: "Lean Mass",
  resting_metabolic_rate: "RMR",
};

const BODY_FAT_EXTRA_LIMITATIONS = [
  "Body fat percentage is method-dependent; Apple Health is transport, not a measurement method.",
  "Oli does not treat ACE Essential / Athletic / Fitness / Average categories as health truth.",
  "Exact personal placement requires a verified age-, sex-, and population-aware screening table plus a known compatible method.",
  "Unknown-method values may display without a personal marker or classification claim.",
] as const;

const LEAN_MASS_EXTRA_LIMITATIONS = [
  "This metric is total Lean Mass — not skeletal muscle, appendicular lean mass, ALM, or ALMI.",
  "Do not apply EWGSOP2 or sarcopenia cutoffs to total Lean Mass alone.",
  "Lean Mass Index (LMI) population references are manufacturer/method-specific and are not approved for unknown-method Apple Health data.",
  "Oli does not assign Low / Typical / High population bands without verified coefficients and compatible device evidence.",
] as const;

function latestPoint(points: WeightPoint[]): WeightPoint | null {
  if (points.length === 0) return null;
  return [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt))[points.length - 1] ?? null;
}

function educationMetricKey(
  historyMetric: BodyHistoryMetricFilter | null,
): "bodyFat" | "leanTissue" | null {
  if (historyMetric === "bodyFat") return "bodyFat";
  if (historyMetric === "leanTissue") return "leanTissue";
  return null;
}

export default function BodyMetricDetailScreen() {
  const { metric: metricParam } = useLocalSearchParams<{ metric: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";
  const [range, setRange] = useState<WeightRangeKey>(BODY_METRIC_DETAIL_DEFAULT_RANGE);

  const metricParamKey = typeof metricParam === "string" ? metricParam : undefined;
  const metric = metricParamKey != null ? PARAM_TO_METRIC[metricParamKey] : undefined;
  const historyMetric = bodyHistoryMetricFromDetailParam(metricParamKey);

  const trends = useBodyMetricTrends(range, metric, { enabled: metric !== undefined });

  useEffect(() => {
    if (!metric || historyMetric == null) return;
    const title = METRIC_TITLES[metric];
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title,
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => navigation.goBack()}
          accessibilityLabel={bodyMetricDetailBackAccessibilityLabel()}
        />
      ),
      headerRight: () => (
        <HeaderControls
          gap={10}
          calendarAccessibilityLabel={bodyHistoryCalendarAccessibilityLabel(historyMetric)}
          onCalendarPress={() => router.push(bodyHistoryCalendarHref(historyMetric) as never)}
          logAccessibilityLabel={bodyHistoryListAccessibilityLabel(historyMetric)}
          onLogPress={() => router.push(bodyHistoryListHref(historyMetric) as never)}
        />
      ),
    });
  }, [navigation, metric, historyMetric, router]);

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

  const educationalModel = useMemo(() => {
    const key = educationMetricKey(historyMetric);
    if (key == null) return null;
    return resolveBodyMetricEducationalReferencePresentation({
      metric: key,
      hasMeasuredValue: points.length > 0,
      measurementMethod: null,
    });
  }, [historyMetric, points.length]);

  const extraLimitations =
    historyMetric === "bodyFat"
      ? BODY_FAT_EXTRA_LIMITATIONS
      : historyMetric === "leanTissue"
        ? LEAN_MASS_EXTRA_LIMITATIONS
        : undefined;

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
  const metricTitle = METRIC_TITLES[metric];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} testID="body-metric-detail-scroll">
        <View style={styles.heroCard} testID={`body-metric-detail-hero-${metricParamKey ?? "unknown"}`}>
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
            <EmptyState
              title={`No ${metricTitle} trend data yet`}
              description="Try a longer range or sync Apple Health body data for this metric."
            />
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

        {historyMetric === "bodyFat" || historyMetric === "leanTissue" ? (
          <BodyMetricDetailEducationPanel
            model={educationalModel}
            {...(extraLimitations != null ? { extraLimitations } : {})}
          />
        ) : null}

        <View style={styles.card} testID="body-metric-detail-history">
          <Text style={styles.sectionTitle}>{metricTitle} History</Text>
          {trends.status !== "ready" || historyRows.length === 0 ? (
            <Text style={styles.placeholder} testID="body-metric-detail-history-empty">
              No {metricTitle} entries in this range
            </Text>
          ) : (
            historyRows.map((p) => (
              <Pressable
                key={`${p.observedAt}-${p.dayKey}-${p.sourceId}`}
                style={({ pressed }) => [styles.historyRow, pressed && styles.historyRowPressed]}
                onPress={() => router.push({ pathname: "/(app)/body/day/[day]", params: { day: p.dayKey } })}
                accessibilityRole="button"
                accessibilityLabel={`Open ${metricTitle} day ${p.dayKey}`}
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
  scroll: { padding: 16, paddingBottom: 40, gap: 16, backgroundColor: UI_SCREEN_BG },
  heroCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  heroLabel: { fontSize: 14, fontWeight: "600", color: "#6E6E73" },
  heroValue: { fontSize: 34, fontWeight: "700", color: "#1C1C1E" },
  heroSub: { fontSize: 15, fontWeight: "500", color: "#3C3C43" },
  heroEmpty: { fontSize: 28, fontWeight: "600", color: "#AEAEB2" },
  card: {
    backgroundColor: UI_CARD_SURFACE,
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
