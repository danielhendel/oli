import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  WEIGHT_HERO_INSUFFICIENT_TREND_COPY,
  type WeightHeroGraphModel,
  type WeightHeroRangeKey,
} from "@/lib/body/weightTrendViewModel";
import { BodyWeightHeroChart } from "@/lib/ui/body/BodyWeightHeroChart";
import { WeightHeroRangeSelector } from "@/lib/ui/body/WeightHeroRangeSelector";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_BORDER_SUBTLE,
  UI_CARD_SURFACE,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export const BODY_WEIGHT_HERO_TRACK_HEIGHT = 168;

export type WeightHeroGraphCardProps = {
  loading: boolean;
  model: WeightHeroGraphModel | null;
  selectedRange: WeightHeroRangeKey;
  onSelectRange: (range: WeightHeroRangeKey) => void;
  error?: { message: string; requestId: string | null; onRetry: () => void } | null;
  testID?: string;
};

/**
 * Hero Weight graph card — selectable time range, delta feedback, and trend line.
 */
export function WeightHeroGraphCard({
  loading,
  model,
  selectedRange,
  onSelectRange,
  error,
  testID = "body-weight-hero-card",
}: WeightHeroGraphCardProps) {
  const showReady = !loading && error == null && model != null && !model.isEmpty;
  const showEmpty = !loading && error == null && (model == null || model.isEmpty);
  const showInsufficient =
    !loading && error == null && model != null && !model.isEmpty && model.insufficientTrend;

  const rootA11y = loading
    ? "Weight trend. Loading."
    : error != null
      ? `Weight trend. ${error.message}`
      : model?.accessibilityLabel ?? "Weight trend.";

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Weight
        </Text>
        {!loading && error == null ? (
          <WeightHeroRangeSelector value={selectedRange} onChange={onSelectRange} />
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading weight trend…" /> : null}

      {!loading && error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : null}

      {!loading && error == null && model != null && model.deltaLabel != null ? (
        <Text
          style={styles.deltaSubtitle}
          testID="body-weight-hero-delta"
          accessibilityLabel={model.deltaLabel}
        >
          {model.deltaLabel}
        </Text>
      ) : null}

      {showInsufficient ? (
        <Text style={styles.insufficientCopy} testID="body-weight-hero-insufficient">
          {WEIGHT_HERO_INSUFFICIENT_TREND_COPY}
        </Text>
      ) : null}

      {showEmpty ? (
        <Text style={styles.emptyCopy} testID="body-weight-hero-empty">
          Log weight to see your trend.
        </Text>
      ) : null}

      {showReady ? (
        <>
          <View style={styles.divider} />
          <View style={styles.chartSection}>
            <BodyWeightHeroChart
              points={model!.chartPoints}
              axisTicks={model!.axisTicks}
              unit={model!.unit}
              targetBandKg={model!.targetBandKg}
              trackHeight={BODY_WEIGHT_HERO_TRACK_HEIGHT}
              testID="body-weight-hero-chart"
            />
            {model!.targetBandKg != null ? (
              <Text style={styles.targetHint} testID="body-weight-hero-target-hint">
                Shaded band: healthy weight range for your height
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 16,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
    flexShrink: 0,
  },
  deltaSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
    paddingTop: 2,
  },
  insufficientCopy: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
    marginVertical: 4,
    alignSelf: "stretch",
  },
  chartSection: {
    width: "100%",
    gap: 12,
    paddingBottom: 2,
  },
  targetHint: {
    fontSize: 11,
    fontWeight: "500",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.05,
    marginTop: 2,
  },
  emptyCopy: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    paddingBottom: 4,
  },
});
