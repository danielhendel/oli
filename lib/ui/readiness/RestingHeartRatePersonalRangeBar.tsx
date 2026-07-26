/**
 * Resting Heart Rate three-zone personal usual-range bar (Views only).
 * Presentation only — bounds, fractions, and marker come from the view model.
 *
 * gray → green/teal usual → gray with a single white current marker.
 * No legend. No second marker. No population zone. No progress-right semantics.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_RHR_ABOVE_USUAL_FILL,
  UI_RHR_BELOW_USUAL_FILL,
  UI_RHR_USUAL_RANGE_BORDER,
  UI_RHR_USUAL_RANGE_FILL,
} from "@/lib/ui/theme/restingHeartRatePersonalRangeChrome";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type RestingHeartRatePersonalRangeBarProps = {
  belowLabel: string;
  usualLabel: string;
  aboveLabel: string;
  belowRangeText: string;
  usualRangeText: string;
  aboveRangeText: string;
  zoneFractions: { below: number; usual: number; above: number };
  currentMarkerPosition01: number;
  accessibilitySummary: string;
  testID?: string;
};

export function RestingHeartRatePersonalRangeBar({
  belowLabel,
  usualLabel,
  aboveLabel,
  belowRangeText,
  usualRangeText,
  aboveRangeText,
  zoneFractions,
  currentMarkerPosition01,
  accessibilitySummary,
  testID = "resting-heart-rate-personal-range",
}: RestingHeartRatePersonalRangeBarProps): React.ReactElement {
  return (
    <View style={styles.wrap} testID={testID}>
      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={accessibilitySummary}
        testID={`${testID}-bar`}
      >
        <View style={styles.labelRow} importantForAccessibility="no">
          <View style={[styles.labelCol, { flex: Math.max(zoneFractions.below, 0.18) }]}>
            <Text style={styles.zoneTitle} numberOfLines={1}>
              {belowLabel}
            </Text>
            <Text style={styles.zoneRange} numberOfLines={1}>
              {belowRangeText}
            </Text>
          </View>
          <View
            style={[
              styles.labelCol,
              styles.labelColCenter,
              { flex: Math.max(zoneFractions.usual, 0.28) },
            ]}
          >
            <Text style={[styles.zoneTitle, styles.usualTitle]} numberOfLines={1}>
              {usualLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeCenter]} numberOfLines={1}>
              {usualRangeText}
            </Text>
          </View>
          <View
            style={[
              styles.labelCol,
              styles.labelColEnd,
              { flex: Math.max(zoneFractions.above, 0.18) },
            ]}
          >
            <Text style={styles.zoneTitle} numberOfLines={1}>
              {aboveLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeEnd]} numberOfLines={1}>
              {aboveRangeText}
            </Text>
          </View>
        </View>

        <View style={styles.track} importantForAccessibility="no">
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.below, 0.001),
                backgroundColor: UI_RHR_BELOW_USUAL_FILL,
              },
            ]}
            testID={`${testID}-below-zone`}
          />
          <View
            style={[
              styles.zone,
              styles.usualZone,
              {
                flex: Math.max(zoneFractions.usual, 0.001),
                backgroundColor: UI_RHR_USUAL_RANGE_FILL,
                borderColor: UI_RHR_USUAL_RANGE_BORDER,
              },
            ]}
            testID={`${testID}-usual-zone`}
          />
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.above, 0.001),
                backgroundColor: UI_RHR_ABOVE_USUAL_FILL,
              },
            ]}
            testID={`${testID}-above-zone`}
          />

          <View
            style={[styles.currentMarker, { left: `${currentMarkerPosition01 * 100}%` }]}
            testID={`${testID}-marker`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 4,
  },
  labelRow: {
    flexDirection: "row",
    gap: 4,
  },
  labelCol: {
    minWidth: 0,
    gap: 2,
  },
  labelColCenter: {
    alignItems: "center",
  },
  labelColEnd: {
    alignItems: "flex-end",
  },
  zoneTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  usualTitle: {
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  zoneRange: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
  },
  zoneRangeCenter: {
    textAlign: "center",
  },
  zoneRangeEnd: {
    textAlign: "right",
  },
  track: {
    height: 16,
    borderRadius: 8,
    overflow: "visible",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  zone: {
    height: "100%",
  },
  usualZone: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  currentMarker: {
    position: "absolute",
    top: -5,
    marginLeft: -2.5,
    width: 5,
    height: 26,
    borderRadius: 2.5,
    backgroundColor: UI_TEXT_PRIMARY,
    zIndex: 2,
  },
});
