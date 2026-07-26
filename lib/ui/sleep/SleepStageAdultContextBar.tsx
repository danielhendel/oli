/**
 * Educational adult-context bar for Deep / REM detail.
 * Presentation only — thresholds and classification live on the typed model.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepStageAdultContextStatus } from "@/lib/data/sleep/sleepStageAdultContext";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";
import {
  UI_STAGE_ADULT_CONTEXT_ABOVE_FILL,
  UI_STAGE_ADULT_CONTEXT_BELOW_FILL,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_BORDER,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  sleepStageAdultContextStatusTextColor,
} from "@/lib/ui/theme/uiTokens";

export type SleepStageAdultContextBarProps = {
  status: SleepStageAdultContextStatus;
  statusLabel: string;
  typicalPercentRangeText: string;
  equivalentMinutesSentence: string;
  belowLabel: string;
  typicalLabel: string;
  aboveLabel: string;
  belowRangeText: string;
  typicalRangeText: string;
  aboveRangeText: string;
  zoneFractions: { below: number; typical: number; above: number };
  markerPosition01: number;
  accessibilitySummary: string;
  testID?: string;
};

export function SleepStageAdultContextBar({
  status,
  statusLabel,
  typicalPercentRangeText,
  equivalentMinutesSentence,
  belowLabel,
  typicalLabel,
  aboveLabel,
  belowRangeText,
  typicalRangeText,
  aboveRangeText,
  zoneFractions,
  markerPosition01,
  accessibilitySummary,
  testID = "sleep-stage-adult-context",
}: SleepStageAdultContextBarProps): React.ReactElement {
  const statusColor = sleepStageAdultContextStatusTextColor(status);

  return (
    <View style={styles.wrap} testID={testID}>
      <Text
        style={[styles.statusLabel, { color: statusColor }]}
        testID={`${testID}-status`}
        accessibilityRole="text"
      >
        {statusLabel}
      </Text>

      <View style={styles.bandBlock} importantForAccessibility="no">
        <Text style={styles.bandHeading}>Typical adult context</Text>
        <Text style={styles.bandPercent}>{typicalPercentRangeText}</Text>
        <Text style={styles.bandEquivalent}>{equivalentMinutesSentence}</Text>
      </View>

      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={accessibilitySummary}
        testID={`${testID}-bar`}
      >
        <View style={styles.labelRow} importantForAccessibility="no">
          <View style={[styles.labelCol, { flex: zoneFractions.below }]}>
            <Text style={styles.zoneTitle} numberOfLines={2}>
              {belowLabel}
            </Text>
            <Text style={styles.zoneRange}>{belowRangeText}</Text>
          </View>
          <View style={[styles.labelCol, { flex: zoneFractions.typical }]}>
            <Text style={[styles.zoneTitle, styles.typicalTitle]} numberOfLines={2}>
              {typicalLabel}
            </Text>
            <Text style={styles.zoneRange}>{typicalRangeText}</Text>
          </View>
          <View style={[styles.labelCol, { flex: zoneFractions.above }]}>
            <Text style={styles.zoneTitle} numberOfLines={2}>
              {aboveLabel}
            </Text>
            <Text style={styles.zoneRange}>{aboveRangeText}</Text>
          </View>
        </View>

        <View style={styles.track} importantForAccessibility="no">
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.below, 0.001),
                backgroundColor: UI_STAGE_ADULT_CONTEXT_BELOW_FILL,
              },
            ]}
            testID={`${testID}-below-zone`}
          />
          <View
            style={[
              styles.zone,
              styles.typicalZone,
              {
                flex: Math.max(zoneFractions.typical, 0.001),
                backgroundColor: UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL,
                borderColor: UI_STAGE_ADULT_CONTEXT_TYPICAL_BORDER,
              },
            ]}
            testID={`${testID}-typical-zone`}
          />
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.above, 0.001),
                backgroundColor: UI_STAGE_ADULT_CONTEXT_ABOVE_FILL,
              },
            ]}
            testID={`${testID}-above-zone`}
          />
          <View
            style={[styles.marker, { left: `${markerPosition01 * 100}%` }]}
            testID={`${testID}-marker`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: METRIC_DETAIL_SECTION_BREAK,
    gap: METRIC_DETAIL_SECTION_HEADING_GAP,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  bandBlock: {
    gap: 2,
  },
  bandHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  bandPercent: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  bandEquivalent: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  labelRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  labelCol: {
    minWidth: 0,
    gap: 2,
  },
  zoneTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  typicalTitle: {
    color: UI_TEXT_PRIMARY,
  },
  zoneRange: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 16,
    borderRadius: 8,
    overflow: "visible",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 8,
  },
  zone: {
    height: "100%",
  },
  typicalZone: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  marker: {
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
