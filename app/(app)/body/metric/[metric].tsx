import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { buildBmiDetailSharedDomain } from "@/lib/body/presentation/buildBmiAxisTicks";
import { buildBodyFatDetailSharedDomain } from "@/lib/body/presentation/buildBodyFatDetailSharedDomain";
import {
  buildBodyMetricTrendDetailModel,
  type BodyMetricTrendDetailModel,
} from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import { buildHistoricalBmiSeries } from "@/lib/body/presentation/buildHistoricalBmiSeries";
import { buildHistoricalFatMassSeries } from "@/lib/body/presentation/buildHistoricalFatMassSeries";
import { buildHistoricalLeanPercentSeries } from "@/lib/body/presentation/buildHistoricalLeanPercentSeries";
import { buildWeightDetailSharedDomain } from "@/lib/body/presentation/buildWeightDetailSharedDomain";
import type {
  BodyFatPrimaryView,
  LeanMassPrimaryView,
  WeightPrimaryView,
} from "@/lib/body/presentation/bodyMetricPrimaryViews";
import {
  bodyHistoryMetricFromDetailParam,
  type BodyHistoryMetricFilter,
} from "@/lib/data/body/bodyHistoryMetricFilter";
import { BODY_METRIC_DETAIL_DEFAULT_RANGE } from "@/lib/data/body/bodyMetricDetailDefaults";
import { useBodyMetricTrends, type BodyTrendMetric } from "@/lib/data/body/useBodyMetricTrends";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { resolveUserProfileMainForInterpretation } from "@/lib/data/body/useBodyCompositionInterpretation";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import type { BodyMetricManualEntryMetric } from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import type { BodyFatAxisTicksModel } from "@/lib/body/presentation/buildBodyFatAxisTicks";
import type { WeightAxisTicksModel } from "@/lib/body/presentation/buildWeightAxisTicks";
import { BodyMetricManualEntrySheet } from "@/lib/ui/body/BodyMetricManualEntrySheet";
import { BodyMetricTrendDetailView } from "@/lib/ui/body/BodyMetricTrendDetailView";
import type { BodyMetricDisplayModeOption } from "@/lib/ui/body/BodyMetricDisplayModeToggle";
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

function manualEntryMetricFor(
  historyMetric: BodyHistoryMetricFilter | null,
): BodyMetricManualEntryMetric | null {
  if (historyMetric === "weight") return "weight";
  if (historyMetric === "bodyFat") return "bodyFat";
  if (historyMetric === "leanTissue") return "leanMass";
  return null;
}

function bmiAxisAsPercentAxis(bmi: ReturnType<typeof buildBmiDetailSharedDomain>): BodyFatAxisTicksModel | null {
  if (bmi == null || bmi.status !== "ready") return null;
  return {
    status: "ready",
    domainMinPercent: bmi.domainMinBmi,
    domainMaxPercent: bmi.domainMaxBmi,
    ticks: bmi.ticks.map((t) => ({
      valuePercent: t.valueBmi,
      label: t.label,
    })),
    step: bmi.step,
  };
}

function formatSignedPercent(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const mag = `${Math.abs(delta).toFixed(1)}%`;
  if (delta > 0) return `+${mag}`;
  if (delta < 0) return `−${mag}`;
  return mag;
}

function formatSignedBmi(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const mag = `${Math.abs(delta).toFixed(1)} BMI`;
  if (delta > 0) return `+${mag}`;
  if (delta < 0) return `−${mag}`;
  return mag;
}

export default function BodyMetricDetailScreen() {
  const { metric: metricParam } = useLocalSearchParams<{ metric: string }>();
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";
  const { state: profileState } = useUserProfileMain();
  const heightCm = useMemo(() => {
    const profile = resolveUserProfileMainForInterpretation(profileState);
    return profile.body.heightCm ?? null;
  }, [profileState]);

  const [range, setRange] = useState<WeightRangeKey>(BODY_METRIC_DETAIL_DEFAULT_RANGE);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [weightView, setWeightView] = useState<WeightPrimaryView>("mass");
  const [bodyFatView, setBodyFatView] = useState<BodyFatPrimaryView>("percentage");
  const [leanView, setLeanView] = useState<LeanMassPrimaryView>("mass");
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
   * Weight / Body Fat / Lean Mass load full available history once so
   * Y-domain stays locked across period selectors; client filters by `range`.
   */
  const trendsFetchRange: WeightRangeKey =
    metric === "weight" ||
    metric === "body_fat_percent" ||
    metric === "lean_body_mass"
      ? "All"
      : range;
  const trends = useBodyMetricTrends(trendsFetchRange, metric, {
    enabled: metric !== undefined,
  });

  /** Companion Weight series for Body Fat mass / Lean % derivation. */
  const needsCompanionWeight =
    metric === "body_fat_percent" || metric === "lean_body_mass";
  const weightCompanion = useBodyMetricTrends("All", "weight", {
    enabled: needsCompanionWeight,
  });

  const canonicalPoints = useMemo((): WeightPoint[] => {
    if (trends.status !== "ready" || !metric) return [];
    return trends.data.byMetric[metric];
  }, [trends, metric]);

  const companionWeightPoints = useMemo((): WeightPoint[] => {
    if (!needsCompanionWeight) return [];
    if (weightCompanion.status !== "ready") return [];
    return weightCompanion.data.byMetric.weight;
  }, [needsCompanionWeight, weightCompanion]);

  const displayModeKey = useMemo(() => {
    if (metric === "weight") return `weight:${weightView}`;
    if (metric === "body_fat_percent") return `bodyFat:${bodyFatView}`;
    if (metric === "lean_body_mass") return `lean:${leanView}`;
    return "default";
  }, [metric, weightView, bodyFatView, leanView]);

  const displaySeriesFull = useMemo((): WeightPoint[] => {
    if (metric === "weight") {
      if (weightView === "bmi") {
        return buildHistoricalBmiSeries({
          weightPoints: canonicalPoints,
          heightCm,
        });
      }
      return canonicalPoints;
    }
    if (metric === "body_fat_percent") {
      if (bodyFatView === "fatMass") {
        return buildHistoricalFatMassSeries({
          bodyFatPoints: canonicalPoints,
          weightPoints: companionWeightPoints,
        });
      }
      return canonicalPoints;
    }
    if (metric === "lean_body_mass") {
      if (leanView === "percentage") {
        return buildHistoricalLeanPercentSeries({
          leanMassPoints: canonicalPoints,
          weightPoints: companionWeightPoints,
        });
      }
      return canonicalPoints;
    }
    return canonicalPoints;
  }, [
    metric,
    weightView,
    bodyFatView,
    leanView,
    canonicalPoints,
    companionWeightPoints,
    heightCm,
  ]);

  const model = useMemo(
    () =>
      buildBodyMetricTrendDetailModel({
        range,
        points: displaySeriesFull,
        stats: { change: null, avg: null, high: null, low: null },
        trendsStatus:
          trends.status === "ready" &&
          needsCompanionWeight &&
          weightCompanion.status === "partial"
            ? "partial"
            : trends.status,
        errorMessage: trends.status === "error" ? trends.error : null,
      }),
    [range, displaySeriesFull, trends, needsCompanionWeight, weightCompanion.status],
  );

  const sharedMassAxis = useMemo((): WeightAxisTicksModel | null => {
    const wantMass =
      (metric === "weight" && weightView === "mass") ||
      (metric === "body_fat_percent" && bodyFatView === "fatMass") ||
      (metric === "lean_body_mass" && leanView === "mass");
    if (!wantMass || displaySeriesFull.length === 0) return null;
    if (unit !== "lb" && unit !== "kg") return null;
    return buildWeightDetailSharedDomain({
      valuesKg: displaySeriesFull.map((p) => p.weightKg),
      unit,
    });
  }, [metric, weightView, bodyFatView, leanView, displaySeriesFull, unit]);

  const sharedPercentAxis = useMemo((): BodyFatAxisTicksModel | null => {
    if (metric === "weight" && weightView === "bmi") {
      return bmiAxisAsPercentAxis(
        buildBmiDetailSharedDomain({
          valuesBmi: displaySeriesFull.map((p) => p.weightKg),
        }),
      );
    }
    if (metric === "body_fat_percent" && bodyFatView === "percentage") {
      if (displaySeriesFull.length === 0) return null;
      return buildBodyFatDetailSharedDomain({
        valuesPercent: displaySeriesFull.map((p) => p.weightKg),
      });
    }
    if (metric === "lean_body_mass" && leanView === "percentage") {
      if (displaySeriesFull.length === 0) return null;
      return buildBodyFatDetailSharedDomain({
        valuesPercent: displaySeriesFull.map((p) => p.weightKg),
      });
    }
    return null;
  }, [metric, weightView, bodyFatView, leanView, displaySeriesFull]);

  useEffect(() => {
    if (model.status === "ready" || model.status === "insufficient") {
      previousReadyRef.current = model;
    }
  }, [model]);

  const formatTrendValue = useCallback(
    (value: number): string => {
      if (!metric) return String(value);
      if (metric === "weight") {
        if (weightView === "bmi") return `${formatBodyBmi(value)} BMI`;
        return formatBodyWeight(value, unit);
      }
      if (metric === "body_fat_percent") {
        if (bodyFatView === "fatMass") return formatBodyWeight(value, unit);
        return `${value.toFixed(1)}%`;
      }
      if (metric === "lean_body_mass") {
        if (leanView === "percentage") return `${value.toFixed(1)}%`;
        return formatBodyLeanMass(value, unit);
      }
      if (metric === "bmi") return formatBodyBmi(value);
      return formatBodyRmr(value);
    },
    [metric, weightView, bodyFatView, leanView, unit],
  );

  const formatTrendChange = useCallback(
    (delta: number): string => {
      if (!metric) return String(delta);
      if (metric === "weight") {
        if (weightView === "bmi") return formatSignedBmi(delta);
        return formatBodyWeightChange(delta, unit);
      }
      if (metric === "body_fat_percent") {
        if (bodyFatView === "fatMass") return formatBodyWeightChange(delta, unit);
        return formatSignedPercent(delta);
      }
      if (metric === "lean_body_mass") {
        if (leanView === "percentage") return formatSignedPercent(delta);
        return formatBodyWeightChange(delta, unit);
      }
      return formatTrendValue(delta);
    },
    [metric, weightView, bodyFatView, leanView, unit, formatTrendValue],
  );

  const chartUnitLabel = (): string => {
    if (!metric) return "";
    if (metric === "weight") {
      if (weightView === "bmi") return "BMI";
      return unit;
    }
    if (metric === "body_fat_percent") {
      if (bodyFatView === "fatMass") return unit;
      return "%";
    }
    if (metric === "lean_body_mass") {
      if (leanView === "percentage") return "%";
      return unit;
    }
    if (metric === "resting_metabolic_rate") return "kcal";
    return "";
  };

  const valueKind = ((): "mass" | "generic" | "percent" => {
    if (metric === "weight") return weightView === "bmi" ? "generic" : "mass";
    if (metric === "body_fat_percent") {
      return bodyFatView === "fatMass" ? "mass" : "percent";
    }
    if (metric === "lean_body_mass") {
      return leanView === "percentage" ? "percent" : "mass";
    }
    return "generic";
  })();

  const displayModeToggle = useMemo(() => {
    if (metric === "weight") {
      const options: BodyMetricDisplayModeOption<WeightPrimaryView>[] = [
        {
          id: "mass",
          label: unit,
          accessibilityLabel: unit === "lb" ? "Show Weight" : "Show Weight in kilograms",
        },
        {
          id: "bmi",
          label: "BMI",
          accessibilityLabel: "Show BMI",
        },
      ];
      return {
        options,
        selected: weightView,
        onChange: (next: string) => setWeightView(next as WeightPrimaryView),
        testID: "body-metric-display-mode-toggle",
      };
    }
    if (metric === "body_fat_percent") {
      const options: BodyMetricDisplayModeOption<BodyFatPrimaryView>[] = [
        {
          id: "percentage",
          label: "%",
          accessibilityLabel: "Show Body Fat percentage",
        },
        {
          id: "fatMass",
          label: unit,
          accessibilityLabel: "Show fat mass",
        },
      ];
      return {
        options,
        selected: bodyFatView,
        onChange: (next: string) => setBodyFatView(next as BodyFatPrimaryView),
        testID: "body-metric-display-mode-toggle",
      };
    }
    if (metric === "lean_body_mass") {
      const options: BodyMetricDisplayModeOption<LeanMassPrimaryView>[] = [
        {
          id: "percentage",
          label: "%",
          accessibilityLabel: "Show Lean Mass percentage",
        },
        {
          id: "mass",
          label: unit,
          accessibilityLabel: "Show Lean Mass",
        },
      ];
      return {
        options,
        selected: leanView,
        onChange: (next: string) => setLeanView(next as LeanMassPrimaryView),
        testID: "body-metric-display-mode-toggle",
      };
    }
    return null;
  }, [metric, unit, weightView, bodyFatView, leanView]);

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
          valueKind={valueKind}
          onRetry={() => {
            trends.refetch();
            if (needsCompanionWeight) weightCompanion.refetch();
          }}
          {...(entryMetric != null
            ? { onPressAddMeasurement: () => setManualEntryOpen(true) }
            : {})}
          retainChartWhileLoading
          previousReadyModel={previousReadyRef.current}
          sharedMassAxis={sharedMassAxis}
          sharedPercentAxis={sharedPercentAxis}
          displayModeToggle={displayModeToggle}
          displayModeKey={displayModeKey}
        />
      </ScrollView>

      {entryMetric != null ? (
        <BodyMetricManualEntrySheet
          visible={manualEntryOpen}
          metric={entryMetric}
          onClose={() => setManualEntryOpen(false)}
          onSaved={() => {
            setManualEntryOpen(false);
            trends.refetch({ cacheBust: `manualMetric:${Date.now()}` });
            if (needsCompanionWeight) {
              weightCompanion.refetch({ cacheBust: `manualMetric:${Date.now()}` });
            }
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: "100%",
    paddingHorizontal: 16,
    // Header owns top Safe Area. 16pt below header → intentional gap before selector.
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
    backgroundColor: UI_SCREEN_BG,
  },
});
