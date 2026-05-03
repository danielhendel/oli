import { UI_CARD_SURFACE, UI_SCREEN_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { WeightBaselineChart, type WeightBaselineChartPoint } from "@/lib/ui/body/WeightBaselineChart";
import type { WeightBaselineCardModel } from "@/lib/data/body/weightBaselineCardModel";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";
import { buildWeightBaselineCardPresentation } from "@/lib/ui/body/weightBaselineCardPresentation";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { STEP_TIER_COLORS } from "@/lib/utils/activityStepTierVisual";


function pillVisualForClassification(
  c: "maintaining" | "gaining" | "losing",
): { label: string; color: string; backgroundColor: string } {
  switch (c) {
    case "gaining":
      return { label: "Gaining", color: STEP_TIER_COLORS.great, backgroundColor: "#EAF7F1" };
    case "losing":
      return { label: "Losing", color: STEP_TIER_COLORS.low, backgroundColor: "#FCECEC" };
    default:
      return { label: "Maintaining", color: SYSTEM_ACCENT, backgroundColor: SYSTEM_ACCENT_FILL_14 };
  }
}

/** Spoken weights for VoiceOver (e.g. "159 pounds") without changing on-screen {@link formatBodyWeight}. */
function formatWeightForAccessibilityLabel(kg: number, unit: "kg" | "lb"): string {
  const s = formatBodyWeight(kg, unit);
  const [numPart, u] = s.split(" ");
  const n = Number(numPart);
  if (!Number.isFinite(n) || u == null) return s;
  const value = Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(1);
  if (u === "lb") return `${value} pounds`;
  if (u === "kg") return `${value} kilograms`;
  return s;
}

function weightBaselineCardAccessibilityLabel(
  unit: "kg" | "lb",
  model: WeightBaselineCardModel,
  extra?: {
    averageLabel: string | null;
    changeLabel: string | null;
    changeKg: number | null;
    rangeDeltaHeadlineValueLabel: string;
  },
): string {
  if (model.kind === "insufficient_data") {
    return model.reason === "no_current_weight"
      ? "Weight Baseline. No current weight for comparison."
      : "Weight Baseline. Not enough weight samples in the last 90 days.";
  }
  const pill = pillVisualForClassification(model.classification).label;
  const cur = formatWeightForAccessibilityLabel(model.currentWeightKg, unit);
  const lo = formatWeightForAccessibilityLabel(model.ninetyDayLowKg, unit);
  const hi = formatWeightForAccessibilityLabel(model.ninetyDayHighKg, unit);
  const fluctuationSpoken =
    extra?.rangeDeltaHeadlineValueLabel != null
      ? extra.rangeDeltaHeadlineValueLabel
          .replace("lb", "pounds")
          .replace("kg", "kilograms")
      : formatWeightForAccessibilityLabel(Math.abs(model.ninetyDayHighKg - model.ninetyDayLowKg), unit);
  const signedChange =
    extra?.changeLabel != null
      ? extra.changeLabel.replace("lb", "pounds").replace("kg", "kilograms")
      : formatWeightForAccessibilityLabel(Math.abs(model.changeFromReferenceKg), unit);
  const deltaForPrefix = extra?.changeKg ?? model.changeFromReferenceKg;
  const changePrefix =
    deltaForPrefix > 0 ? "plus" : deltaForPrefix < 0 ? "minus" : "zero";
  const averageSentence =
    extra?.averageLabel != null ? ` Average ${extra.averageLabel.replace("lb", "pounds").replace("kg", "kilograms")}.` : "";
  return `Weight Baseline. ${pill}. Ninety-day fluctuation range plus or minus ${fluctuationSpoken}. Current weight ${cur}. Low ${lo}. High ${hi}. Change ${changePrefix} ${signedChange}.${averageSentence}`;
}

export type WeightBaselineCardProps = {
  unit: "kg" | "lb";
  loading: boolean;
  error: { message: string; requestId: string | null; onRetry: () => void } | null;
  model: WeightBaselineCardModel | null;
  /** 90-day weight points for trend line rendering; already fetched in Body overview path. */
  chartPoints?: readonly WeightBaselineChartPoint[];
  /** Optional wrapper props (e.g. testID) merged onto the outer card. */
  cardProps?: Omit<ViewProps, "children" | "style"> & { style?: ViewProps["style"] };
};

export function WeightBaselineCard({ unit, loading, error, model, chartPoints = [], cardProps }: WeightBaselineCardProps) {
  const { style: cardStyle, ...cardRest } = cardProps ?? {};
  const showReady = !loading && error == null && model?.kind === "ready";
  const showInsufficient = !loading && error == null && model?.kind === "insufficient_data";
  const pill = showReady ? pillVisualForClassification(model.classification) : null;
  const presentation = showReady
    ? buildWeightBaselineCardPresentation({ model, points: chartPoints, unit })
    : null;
  const a11y =
    model != null
      ? weightBaselineCardAccessibilityLabel(unit, model, presentation == null ? undefined : presentation)
      : "Weight Baseline. Loading.";

  return (
    <View
      {...cardRest}
      style={[styles.card, cardStyle]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y}
    >
      <View style={styles.titleRow}>
        <View style={styles.titlePillLeftGroup}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Weight Baseline
          </Text>
          {pill != null ? (
            <ActivityRatingPill
              label={pill.label}
              color={pill.color}
              backgroundColor={pill.backgroundColor}
              emphasis="subtle"
              compactChrome
              labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
              testID="weight-baseline-classification-pill"
            />
          ) : null}
        </View>
        {showReady ? (
          <View style={styles.heroHeadlineRow}>
            <Text style={styles.heroWeight} numberOfLines={1}>
              <Text style={styles.heroPlusMinus}>±</Text>
              {presentation!.rangeDeltaHeadlineValueLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading weight baseline…" /> : null}
      {!loading && error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : null}

      {showReady ? (
        <View style={styles.readyBlock} testID="weight-baseline-ready-block">
          <View style={styles.trackSlot} testID="weight-baseline-track-slot">
            <WeightBaselineChart
              points={chartPoints}
              lowKg={model.ninetyDayLowKg}
              highKg={model.ninetyDayHighKg}
              currentKg={model.currentWeightKg}
              yMinKg={presentation!.chartMinKg}
              yMaxKg={presentation!.chartMaxKg}
              unit={unit}
              xAxisLabels={presentation!.xAxisLabels}
              classification={model.classification}
            />
          </View>
          <View style={styles.insightsGrid} testID="weight-baseline-insights-grid">
            <View style={styles.insightCell} testID="weight-baseline-insight-low">
              <Text style={styles.insightLabel}>90 Day Low</Text>
              <Text style={styles.insightValue}>{presentation!.lowLabel}</Text>
            </View>
            <View style={styles.insightCell} testID="weight-baseline-insight-high">
              <Text style={styles.insightLabel}>90 Day High</Text>
              <Text style={styles.insightValue}>{presentation!.highLabel}</Text>
            </View>
            <View style={styles.insightCell} testID="weight-baseline-insight-change">
              <Text style={styles.insightLabel}>Change</Text>
              <Text style={styles.insightValue}>{presentation!.changeLabel ?? "0.0"}</Text>
            </View>
            <View style={styles.insightCell} testID="weight-baseline-insight-average">
              <Text style={styles.insightLabel}>Average</Text>
              <Text style={styles.insightValue}>{presentation!.averageLabel ?? "—"}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {showInsufficient ? (
        <Text style={styles.insufficientCopy}>
          {model.reason === "no_current_weight"
            ? "Add a weight measurement to see your baseline."
            : "Not enough weight samples in the last 90 days yet."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 2,
  },
  titlePillLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  heroHeadlineRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
    gap: 0,
    flexShrink: 0,
    maxWidth: "48%",
  },
  heroPlusMinus: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.26,
  },
  heroWeight: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.5,
    flexShrink: 1,
    textAlign: "right",
  },
  readyBlock: {
    gap: 6,
    marginTop: 2,
  },
  trackSlot: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  insightsGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    columnGap: 10,
  },
  insightCell: {
    width: "48.5%",
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: UI_SCREEN_BG,
  },
  insightLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.05,
    textAlign: "center",
  },
  insightValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.1,
    textAlign: "center",
  },
  insufficientCopy: {
    fontSize: 14,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    marginTop: 2,
  },
});
