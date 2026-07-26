/**
 * Simplified Deep / REM typical-range bar (Duration visual grammar).
 * Presentation only — thresholds, domains, and markers come from the view model.
 *
 * gray → green → gray with white current marker and optional outlined 90-day marker.
 * Visible status sentence is intentionally omitted — the bar is the interpretation.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_STAGE_ADULT_CONTEXT_OUTER_FILL,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_BORDER,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type SleepStageAdultContextBarProps = {
  belowLabel: string;
  typicalLabel: string;
  aboveLabel: string;
  belowRangeText: string;
  typicalRangeText: string;
  aboveRangeText: string;
  zoneFractions: { below: number; typical: number; above: number };
  currentMarkerPosition01: number;
  /** Null when 90-day average percent is insufficient. */
  ninetyDayMarkerPosition01: number | null;
  accessibilitySummary: string;
  testID?: string;
};

export function SleepStageAdultContextBar({
  belowLabel,
  typicalLabel,
  aboveLabel,
  belowRangeText,
  typicalRangeText,
  aboveRangeText,
  zoneFractions,
  currentMarkerPosition01,
  ninetyDayMarkerPosition01,
  accessibilitySummary,
  testID = "sleep-stage-adult-context",
}: SleepStageAdultContextBarProps): React.ReactElement {
  const showNinetyDay = ninetyDayMarkerPosition01 != null;

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
          <View style={[styles.labelCol, styles.labelColCenter, { flex: Math.max(zoneFractions.typical, 0.18) }]}>
            <Text style={[styles.zoneTitle, styles.typicalTitle]} numberOfLines={1}>
              {typicalLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeCenter]} numberOfLines={1}>
              {typicalRangeText}
            </Text>
          </View>
          <View style={[styles.labelCol, styles.labelColEnd, { flex: Math.max(zoneFractions.above, 0.18) }]}>
            <Text style={[styles.zoneTitle, styles.zoneTitleEnd]} numberOfLines={1}>
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
                backgroundColor: UI_STAGE_ADULT_CONTEXT_OUTER_FILL,
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
                backgroundColor: UI_STAGE_ADULT_CONTEXT_OUTER_FILL,
              },
            ]}
            testID={`${testID}-above-zone`}
          />

          {showNinetyDay ? (
            <View
              style={[
                styles.ninetyDayMarker,
                { left: `${ninetyDayMarkerPosition01! * 100}%` },
              ]}
              testID={`${testID}-ninety-day-marker`}
            />
          ) : null}

          <View
            style={[styles.currentMarker, { left: `${currentMarkerPosition01 * 100}%` }]}
            testID={`${testID}-marker`}
          />
        </View>

        <View style={styles.legend} importantForAccessibility="no" testID={`${testID}-legend`}>
          <View style={styles.legendItem}>
            <View style={styles.legendCurrentGlyph} />
            <Text style={styles.legendText}>Today</Text>
          </View>
          {showNinetyDay ? (
            <View style={styles.legendItem}>
              <View style={styles.legendNinetyGlyph} />
              <Text style={styles.legendText}>90-day average</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Match Duration reference-bar rhythm: tight under hero, no section-break gap. */
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
  zoneTitleEnd: {
    textAlign: "right",
  },
  typicalTitle: {
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
  typicalZone: {
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
    zIndex: 3,
  },
  ninetyDayMarker: {
    position: "absolute",
    top: 1,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: UI_TEXT_PRIMARY,
    backgroundColor: "transparent",
    zIndex: 2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendCurrentGlyph: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    backgroundColor: UI_TEXT_PRIMARY,
  },
  legendNinetyGlyph: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: UI_TEXT_PRIMARY,
    backgroundColor: "transparent",
  },
  legendText: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
});
