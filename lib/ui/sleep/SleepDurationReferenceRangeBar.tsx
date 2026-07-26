/**
 * Horizontal Sleep Duration reference-range bar (Views only — no chart library).
 * Thresholds and classification live in the typed reference model; this is layout only.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  sleepDurationReferenceMarkerPosition01,
  sleepDurationReferenceZoneCopy,
  sleepDurationReferenceZoneFractions,
  type SleepDurationReferenceResult,
} from "@/lib/data/sleep/sleepDurationReference";
import {
  UI_RECOMMENDED_RANGE_BORDER,
  UI_RECOMMENDED_RANGE_FILL,
  UI_REFERENCE_ZONE_NEUTRAL_FILL,
  UI_REFERENCE_ZONE_NEUTRAL_FILL_SOFT,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type SleepDurationReferenceRangeBarProps = {
  result: SleepDurationReferenceResult;
  durationMinutes: number;
  accessibilitySummary: string;
  testID?: string;
};

export function SleepDurationReferenceRangeBar({
  result,
  durationMinutes,
  accessibilitySummary,
  testID = "sleep-duration-reference-bar",
}: SleepDurationReferenceRangeBarProps): React.ReactElement {
  const zones = sleepDurationReferenceZoneFractions(result);
  const copy = sleepDurationReferenceZoneCopy(result);
  const marker01 = sleepDurationReferenceMarkerPosition01(durationMinutes);

  return (
    <View
      style={styles.wrap}
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={accessibilitySummary}
    >
      <View style={styles.labelRow} importantForAccessibility="no">
        <View style={[styles.labelCol, { flex: zones.below }]}>
          <Text style={styles.zoneTitle} numberOfLines={2}>
            {copy.belowLabel}
          </Text>
          <Text style={styles.zoneRange}>{copy.belowRangeText}</Text>
        </View>
        <View style={[styles.labelCol, { flex: zones.recommended }]}>
          <Text style={[styles.zoneTitle, styles.recommendedTitle]} numberOfLines={2}>
            {copy.recommendedLabel}
          </Text>
          <Text style={styles.zoneRange}>{copy.recommendedRangeText}</Text>
        </View>
        <View style={[styles.labelCol, { flex: zones.above }]}>
          <Text style={styles.zoneTitle} numberOfLines={2}>
            {copy.aboveLabel}
          </Text>
          <Text style={styles.zoneRange}>{copy.aboveRangeText}</Text>
        </View>
      </View>

      <View style={styles.track} importantForAccessibility="no">
        <View
          style={[
            styles.zone,
            {
              flex: Math.max(zones.below, 0.001),
              backgroundColor: UI_REFERENCE_ZONE_NEUTRAL_FILL,
            },
          ]}
        />
        <View
          style={[
            styles.zone,
            styles.recommendedZone,
            {
              flex: Math.max(zones.recommended, 0.001),
              backgroundColor: UI_RECOMMENDED_RANGE_FILL,
              borderColor: UI_RECOMMENDED_RANGE_BORDER,
            },
          ]}
          testID={`${testID}-recommended-zone`}
        />
        <View
          style={[
            styles.zone,
            {
              flex: Math.max(zones.above, 0.001),
              backgroundColor: UI_REFERENCE_ZONE_NEUTRAL_FILL_SOFT,
            },
          ]}
        />
        <View
          style={[styles.marker, { left: `${marker01 * 100}%` }]}
          testID={`${testID}-marker`}
        />
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
  zoneTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  recommendedTitle: {
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
  },
  zone: {
    height: "100%",
  },
  recommendedZone: {
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
