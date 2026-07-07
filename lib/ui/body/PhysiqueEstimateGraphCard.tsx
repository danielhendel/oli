import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import type { PhysiqueEstimateModel, PhysiqueSegmentEstimate } from "@/lib/body/physiqueEstimate";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_BORDER_SUBTLE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

const SEGMENT_COLORS: Record<string, string> = {
  muscle: "#5E5CE6",
  leanTissue: "#5E5CE6",
  bodyFat: "#FF9F0A",
  other: "rgba(174,174,178,0.55)",
};

const SEGMENT_RANGE_COLORS: Record<string, string> = {
  muscle: "rgba(94, 92, 230, 0.35)",
  leanTissue: "rgba(94, 92, 230, 0.35)",
  bodyFat: "rgba(255, 159, 10, 0.35)",
  other: "rgba(174,174,178, 0.25)",
};

const DEFAULT_SEGMENT_COLOR = "rgba(174,174,178,0.55)";
const DEFAULT_RANGE_COLOR = "rgba(174,174,178, 0.25)";

function segmentColor(key: string): string {
  return SEGMENT_COLORS[key] ?? DEFAULT_SEGMENT_COLOR;
}

function segmentRangeColor(key: string): string {
  return SEGMENT_RANGE_COLORS[key] ?? DEFAULT_RANGE_COLOR;
}

export type PhysiqueEstimateGraphCardProps = {
  loading: boolean;
  model: PhysiqueEstimateModel | null;
  testID?: string;
};

function PhysiqueStackedBar({
  segments,
  testID,
}: {
  segments: readonly PhysiqueSegmentEstimate[];
  testID: string;
}) {
  const barH = 14;
  const viewW = 300;
  let x = 0;

  return (
    <View style={styles.barWrap} testID={testID}>
      <Svg width="100%" height={barH} viewBox={`0 0 ${viewW} ${barH}`}>
        {segments.map((seg) => {
          const wCenter = Math.max(2, seg.shareCenter * viewW);
          const wLo = Math.max(0, (seg.shareLo - seg.shareCenter) * viewW);
          const wHi = Math.max(0, (seg.shareHi - seg.shareCenter) * viewW);
          const rangeX = x + wCenter / 2 - (wLo + wCenter / 2 + wHi / 2);
          const rangeW = wLo + wCenter + wHi;
          const el = (
            <React.Fragment key={seg.key}>
              <Rect
                x={rangeX}
                y={0}
                width={Math.max(2, rangeW)}
                height={barH}
                rx={3}
                fill={segmentRangeColor(seg.key)}
              />
              <Rect
                x={x}
                y={2}
                width={wCenter}
                height={barH - 4}
                rx={2}
                fill={segmentColor(seg.key)}
              />
            </React.Fragment>
          );
          x += wCenter;
          return el;
        })}
      </Svg>
    </View>
  );
}

/**
 * Physique estimate card — stacked composition ranges with "likely range" copy.
 */
export function PhysiqueEstimateGraphCard({
  loading,
  model,
  testID = "body-physique-estimate-card",
}: PhysiqueEstimateGraphCardProps) {
  const isReady = !loading && model != null && model.status === "ready";
  const isMissing = !loading && model != null && model.status === "missing";

  const rootA11y =
    loading
      ? "Physique estimate. Loading."
      : model?.status === "ready"
        ? model.accessibilityLabel
        : model?.accessibilityLabel ?? "Physique estimate.";

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        Physique Estimate
      </Text>

      {loading ? <LoadingState variant="inline" message="Loading physique estimate…" /> : null}

      {isMissing ? (
        <Text style={styles.emptyCopy} testID="body-physique-missing">
          {model!.message}
        </Text>
      ) : null}

      {isReady ? (
        <View style={styles.body} testID="body-physique-ready">
          <Text style={styles.subtitle}>{model!.sourceNote}</Text>
          <PhysiqueStackedBar segments={model!.segments} testID="body-physique-stacked-bar" />
          <Text style={styles.rangeCaption}>Likely ranges — not exact measurements</Text>
          <View style={styles.divider} />
          <View style={styles.segmentRows}>
            {model!.segments.map((seg) => (
              <View key={seg.key} style={styles.segmentRow} testID={`body-physique-row-${seg.key}`}>
                <View style={styles.segmentLabelCol}>
                  <View
                    style={[styles.swatch, { backgroundColor: segmentColor(seg.key) }]}
                  />
                  <Text style={styles.segmentLabel}>{seg.label}</Text>
                </View>
                <Text style={styles.segmentRange} numberOfLines={1}>
                  {capitalizeFirst(seg.rangeLabel)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.disclaimer}>
            Body composition values are estimates unless measured by DEXA.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function capitalizeFirst(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
  },
  body: {
    gap: 8,
    paddingTop: 2,
  },
  barWrap: {
    width: "100%",
    marginTop: 2,
  },
  rangeCaption: {
    fontSize: 11,
    fontWeight: "500",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.05,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
    marginVertical: 2,
    alignSelf: "stretch",
  },
  segmentRows: {
    gap: 6,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 28,
  },
  segmentLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.15,
  },
  segmentRange: {
    fontSize: 14,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    textAlign: "right",
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: "400",
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
