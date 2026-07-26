/**
 * Personal-baseline rail for Deep / REM detail.
 *
 * Neutral visualization: 90-day personal average as center reference,
 * current result as a marker. No Good/Bad, no green target zone,
 * no red/amber/green status ladder. Color is decorative only.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepStagePersonalComparison } from "@/lib/data/sleep/sleepStagePersonalComparison";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";
import {
  UI_REFERENCE_ZONE_NEUTRAL_FILL,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type SleepStagePersonalBaselineRailProps = {
  comparison: SleepStagePersonalComparison;
  currentMinutes: number;
  baselineMinutes: number;
  testID?: string;
};

/**
 * Map current vs baseline onto a 0–1 rail position.
 * Baseline is fixed at center (0.5). Current is offset by relative difference,
 * clamped so both markers stay visible.
 */
export function sleepStageBaselineRailPositions(input: {
  currentMinutes: number;
  baselineMinutes: number;
}): { baseline: number; current: number } {
  const { currentMinutes, baselineMinutes } = input;
  const baseline = 0.5;
  if (!Number.isFinite(currentMinutes) || !Number.isFinite(baselineMinutes)) {
    return { baseline, current: baseline };
  }
  if (baselineMinutes <= 0) {
    return { baseline, current: baseline };
  }
  const relative = (currentMinutes - baselineMinutes) / baselineMinutes;
  const current = Math.min(0.92, Math.max(0.08, baseline + relative * 0.35));
  return { baseline, current };
}

export function SleepStagePersonalBaselineRail({
  comparison,
  currentMinutes,
  baselineMinutes,
  testID = "sleep-stage-personal-baseline",
}: SleepStagePersonalBaselineRailProps): React.ReactElement {
  const positions = useMemo(
    () => sleepStageBaselineRailPositions({ currentMinutes, baselineMinutes }),
    [currentMinutes, baselineMinutes],
  );

  return (
    <View
      style={styles.wrap}
      testID={testID}
      accessible
      accessibilityLabel={comparison.accessibilitySummary}
    >
      <Text style={styles.heading} accessibilityRole="header">
        {comparison.heading}
      </Text>

      <View style={styles.railTrack} testID={`${testID}-rail`}>
        <View style={styles.railFill} />
        <View
          style={[styles.baselineMarker, { left: `${positions.baseline * 100}%` }]}
          testID={`${testID}-baseline-marker`}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View
          style={[styles.currentMarker, { left: `${positions.current * 100}%` }]}
          testID={`${testID}-current-marker`}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>

      <View style={styles.valuesRow}>
        <View style={styles.valueBlock}>
          <Text style={styles.valueLabel}>Current</Text>
          <Text style={styles.valueText}>{comparison.currentFormatted}</Text>
        </View>
        <View style={[styles.valueBlock, styles.valueBlockEnd]}>
          <Text style={styles.valueLabel}>{comparison.baselineLabel}</Text>
          <Text style={styles.valueText}>{comparison.baselineFormatted}</Text>
        </View>
      </View>

      <Text style={styles.difference} testID={`${testID}-difference`}>
        {comparison.differenceSentence}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: METRIC_DETAIL_SECTION_BREAK,
    gap: METRIC_DETAIL_SECTION_HEADING_GAP,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  railTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: UI_REFERENCE_ZONE_NEUTRAL_FILL,
    justifyContent: "center",
    overflow: "visible",
    marginVertical: 4,
  },
  railFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    backgroundColor: UI_REFERENCE_ZONE_NEUTRAL_FILL,
  },
  baselineMarker: {
    position: "absolute",
    width: 2,
    height: 18,
    marginLeft: -1,
    top: -3,
    borderRadius: 1,
    backgroundColor: UI_TEXT_SECONDARY,
  },
  currentMarker: {
    position: "absolute",
    width: 12,
    height: 12,
    marginLeft: -6,
    top: 0,
    borderRadius: 6,
    backgroundColor: UI_TEXT_PRIMARY,
    borderWidth: 2,
    borderColor: UI_REFERENCE_ZONE_NEUTRAL_FILL,
  },
  valuesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  valueBlock: {
    flex: 1,
    gap: 2,
  },
  valueBlockEnd: {
    alignItems: "flex-end",
  },
  valueLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
  },
  valueText: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  difference: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    marginTop: 2,
  },
});
