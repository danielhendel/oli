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
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type SleepDurationReferenceRangeBarProps = {
  result: SleepDurationReferenceResult;
  durationMinutes: number;
  accessibilitySummary: string;
  testID?: string;
};

/** Supplementary zone fills — labels carry meaning. */
const ZONE_BELOW = "rgba(148, 163, 184, 0.35)";
const ZONE_RECOMMENDED = "rgba(96, 165, 250, 0.45)";
const ZONE_ABOVE = "rgba(148, 163, 184, 0.28)";

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
          <Text style={styles.zoneTitle} numberOfLines={2}>
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
            { flex: Math.max(zones.below, 0.001), backgroundColor: ZONE_BELOW },
          ]}
        />
        <View
          style={[
            styles.zone,
            { flex: Math.max(zones.recommended, 0.001), backgroundColor: ZONE_RECOMMENDED },
          ]}
        />
        <View
          style={[
            styles.zone,
            { flex: Math.max(zones.above, 0.001), backgroundColor: ZONE_ABOVE },
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
  zoneRange: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 14,
    borderRadius: 7,
    overflow: "visible",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  zone: {
    height: "100%",
  },
  marker: {
    position: "absolute",
    top: -4,
    marginLeft: -2,
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: UI_TEXT_PRIMARY,
  },
});
