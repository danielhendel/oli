/**
 * Sleep Efficiency two-zone guideline bar (Views only — no chart library).
 * Presentation only — threshold, domains, and marker come from the view model.
 *
 * gray → green with a single white current/today marker.
 * No Above Guideline zone. No legend. No second marker.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_SLEEP_EFFICIENCY_BELOW_FILL,
  UI_SLEEP_EFFICIENCY_MEETS_BORDER,
  UI_SLEEP_EFFICIENCY_MEETS_FILL,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type SleepEfficiencyGuidelineBarProps = {
  belowLabel: string;
  meetsLabel: string;
  belowRangeText: string;
  meetsRangeText: string;
  zoneFractions: { below: number; meets: number };
  currentMarkerPosition01: number;
  accessibilitySummary: string;
  testID?: string;
};

export function SleepEfficiencyGuidelineBar({
  belowLabel,
  meetsLabel,
  belowRangeText,
  meetsRangeText,
  zoneFractions,
  currentMarkerPosition01,
  accessibilitySummary,
  testID = "sleep-efficiency-guideline",
}: SleepEfficiencyGuidelineBarProps): React.ReactElement {
  return (
    <View style={styles.wrap} testID={testID}>
      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={accessibilitySummary}
        testID={`${testID}-bar`}
      >
        <View style={styles.labelRow} importantForAccessibility="no">
          <View style={[styles.labelCol, { flex: Math.max(zoneFractions.below, 0.22) }]}>
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
              styles.labelColEnd,
              { flex: Math.max(zoneFractions.meets, 0.22) },
            ]}
          >
            <Text style={[styles.zoneTitle, styles.meetsTitle]} numberOfLines={1}>
              {meetsLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeEnd]} numberOfLines={1}>
              {meetsRangeText}
            </Text>
          </View>
        </View>

        <View style={styles.track} importantForAccessibility="no">
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.below, 0.001),
                backgroundColor: UI_SLEEP_EFFICIENCY_BELOW_FILL,
              },
            ]}
            testID={`${testID}-below-zone`}
          />
          <View
            style={[
              styles.zone,
              styles.meetsZone,
              {
                flex: Math.max(zoneFractions.meets, 0.001),
                backgroundColor: UI_SLEEP_EFFICIENCY_MEETS_FILL,
                borderColor: UI_SLEEP_EFFICIENCY_MEETS_BORDER,
              },
            ]}
            testID={`${testID}-meets-zone`}
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
  meetsTitle: {
    color: UI_TEXT_PRIMARY,
    textAlign: "right",
  },
  zoneRange: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
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
  meetsZone: {
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
