import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { buildBodyFatDetailSharedDomain } from "@/lib/body/presentation/buildBodyFatDetailSharedDomain";
import {
  buildBodyMetricTrendDetailModel,
  type BodyMetricTrendDetailModel,
} from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import { buildWeightDetailSharedDomain } from "@/lib/body/presentation/buildWeightDetailSharedDomain";
import { resolveBodyMetricEducationalReferencePresentation } from "@/lib/body/standards/resolveEducationalReferencePresentation";
import {
  bodyHistoryMetricFromDetailParam,
  type BodyHistoryMetricFilter,
} from "@/lib/data/body/bodyHistoryMetricFilter";
import { BODY_METRIC_DETAIL_DEFAULT_RANGE } from "@/lib/data/body/bodyMetricDetailDefaults";
import { useBodyMetricTrends, type BodyTrendMetric } from "@/lib/data/body/useBodyMetricTrends";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { BodyMetricDetailEducationPanel } from "@/lib/ui/body/BodyMetricDetailEducationPanel";
import { BodyMetricManualEntrySheet } from "@/lib/ui/body/BodyMetricManualEntrySheet";
import { BodyMetricTrendDetailView } from "@/lib/ui/body/BodyMetricTrendDetailView";
import {
  formatBodyBmi,
  formatBodyLeanMass,
  formatBodyRmr,
  formatBodyWeight,
  formatBodyWeightChange,
} from "@/lib/ui/body/bodyMetricFormatting";
import { useBodyMetricDetailHeader } from "@/lib/ui/headers/useBodyMetricDetailHeader";
import { ScreenContainer, ErrorState } from "@/lib/ui/ScreenStates";
import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import type { BodyMetricManualEntryMetric } from "@/lib/body/presentation/bodyMetricManualEntryValidation";

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

const LEAN_MASS_EXTRA_LIMITATIONS = [
  "This metric is total Lean Mass — not skeletal muscle, appendicular lean mass, ALM, or ALMI.",
  "The current Lean Mass graph shows share of total mass only — not a population reference or health rating.",
  "Do not apply EWGSOP2 or sarcopenia cutoffs to total Lean Mass alone.",
  "Kelly et al. 2009 NHANES Table S5 (Lean Mass/Height²) is Hologic/NHANES method-specific and stratified by reference sex and ethnicity — Oli does not silently select a reference population.",
  "Unknown-method Apple Health data cannot be placed on a DXA population reference.",
  "Numerical Lean Mass reference research is deferred — not abandoned — pending Stage 3D measurement provenance and a separate non-inferred reference-population decision.",
] as const;

/** Detail-page education remains Lean Mass only — Body Fat education lives on the landing card. */
function educationMetricKey(
  historyMetric: BodyHistoryMetricFilter | null,
): "leanTissue" | null {
  if (historyMetric === "leanTissue") return "leanTissue";
  return null;
}

function manualEntryMetricFor(
  historyMetric: BodyHistoryMetricFilter | null,
): BodyMetricManualEntryMetric | null {
  if (historyMetric === "weight") return "weight";
  if (historyMetric === "bodyFat") return "bodyFat";
  if (historyMetric === "leanTissue") return "leanMass";
  return null;
}

export default function BodyMetricDetailScreen() {
  const { metric: metricParam } = useLocalSearchParams<{ metric: string }>();
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";
  const [range, setRange] = useState<WeightRangeKey>(BODY_METRIC_DETAIL_DEFAULT_RANGE);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const previousReadyRef = useRef<BodyMetricTrendDetailModel | null>(null);

  const metricParamKey = typeof metricParam === "string" ? metricParam : undefined;
  const metric = metricParamKey != null ? PARAM_TO_METRIC[metricParamKey] : undefined;
  const historyMetric = bodyHistoryMetricFromDetailParam(metricParamKey);
  const metricTitle = metric != null ? METRIC_TITLES[metric] : "Metric";

  useBodyMetricDetailHeader({
    title: metricTitle,
    historyMetric: historyMetric ?? "weight",
  });

  /**
   * Weight + Body Fat load full available history once (All → 5Y window) so
   * Y-domain stays locked across period selectors; client filters by `range`.
   * Other metrics keep range-scoped fetches.
   */
  const trendsFetchRange: WeightRangeKey =
    metric === "weight" || metric === "body_fat_percent" ? "All" : range;
  const trends = useBodyMetricTrends(trendsFetchRange, metric, { enabled: metric !== undefined });

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

  const model = useMemo(
    () =>
      buildBodyMetricTrendDetailModel({
        range,
        points,
        stats,
        trendsStatus: trends.status,
        errorMessage: trends.status === "error" ? trends.error : null,
      }),
    [range, points, stats, trends],
  );

  const sharedMassAxis = useMemo(() => {
    if (metric !== "weight" || points.length === 0) return null;
    if (unit !== "lb" && unit !== "kg") return null;
    return buildWeightDetailSharedDomain({
      valuesKg: points.map((p) => p.weightKg),
      unit,
    });
  }, [metric, points, unit]);

  const sharedPercentAxis = useMemo(() => {
    if (metric !== "body_fat_percent" || points.length === 0) return null;
    return buildBodyFatDetailSharedDomain({
      valuesPercent: points.map((p) => p.weightKg),
    });
  }, [metric, points]);

  useEffect(() => {
    if (model.status === "ready" || model.status === "insufficient") {
      previousReadyRef.current = model;
    }
  }, [model]);

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
    historyMetric === "leanTissue" ? LEAN_MASS_EXTRA_LIMITATIONS : undefined;

  const formatTrendValue = (value: number): string => {
    if (!metric) return String(value);
    if (metric === "weight") return formatBodyWeight(value, unit);
    if (metric === "body_fat_percent") return `${value.toFixed(1)}%`;
    if (metric === "bmi") return formatBodyBmi(value);
    if (metric === "lean_body_mass") return formatBodyLeanMass(value, unit);
    return formatBodyRmr(value);
  };

  const formatTrendChange = (delta: number): string => {
    if (!metric) return String(delta);
    if (metric === "weight" || metric === "lean_body_mass") {
      return formatBodyWeightChange(delta, unit);
    }
    if (metric === "body_fat_percent") {
      if (!Number.isFinite(delta)) return "—";
      const mag = `${Math.abs(delta).toFixed(1)}%`;
      if (delta > 0) return `+${mag}`;
      if (delta < 0) return `−${mag}`;
      return mag;
    }
    if (metric === "bmi") {
      if (!Number.isFinite(delta)) return "—";
      const mag = Math.abs(delta).toFixed(1);
      if (delta > 0) return `+${mag}`;
      if (delta < 0) return `−${mag}`;
      return mag;
    }
    return formatTrendValue(delta);
  };

  const chartUnitLabel = (): string => {
    if (!metric) return "";
    if (metric === "weight" || metric === "lean_body_mass") return unit;
    if (metric === "body_fat_percent") return "%";
    if (metric === "resting_metabolic_rate") return "kcal";
    return "";
  };

  const entryMetric = manualEntryMetricFor(historyMetric);

  if (!metric || historyMetric == null) {
    return (
      <ScreenContainer edges={[]} padded={false}>
        <ErrorState message="Unknown metric" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={[]} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        testID="body-metric-detail-scroll"
        keyboardShouldPersistTaps="handled"
      >
        <BodyMetricTrendDetailView
          metricTitle={metricTitle}
          model={model}
          range={range}
          onChangeRange={setRange}
          formatValue={formatTrendValue}
          formatChange={formatTrendChange}
          unitLabel={chartUnitLabel()}
          valueKind={
            metric === "weight" || metric === "lean_body_mass"
              ? "mass"
              : metric === "body_fat_percent"
                ? "percent"
                : "generic"
          }
          onRetry={() => trends.refetch()}
          {...(entryMetric != null
            ? { onPressAddMeasurement: () => setManualEntryOpen(true) }
            : {})}
          retainChartWhileLoading
          previousReadyModel={previousReadyRef.current}
          sharedMassAxis={sharedMassAxis}
          sharedPercentAxis={sharedPercentAxis}
        />

        {historyMetric === "leanTissue" ? (
          <View style={styles.educationWrap}>
            <BodyMetricDetailEducationPanel
              model={educationalModel}
              {...(extraLimitations != null ? { extraLimitations } : {})}
            />
          </View>
        ) : null}
      </ScrollView>

      {entryMetric != null ? (
        <BodyMetricManualEntrySheet
          visible={manualEntryOpen}
          metric={entryMetric}
          onClose={() => setManualEntryOpen(false)}
          onSaved={() => {
            setManualEntryOpen(false);
            trends.refetch({ cacheBust: `manualMetric:${Date.now()}` });
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    // Header owns top Safe Area. 16pt below header → intentional gap before selector.
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
    backgroundColor: UI_SCREEN_BG,
  },
  educationWrap: {
    marginTop: 4,
  },
});
