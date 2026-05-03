import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { CardioDistanceTier } from "@/lib/data/workouts/cardioSessionPresentation";
import { cardioDistanceTierLabel } from "@/lib/data/workouts/cardioSessionPresentation";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import {
  activityStepTierBarVisual,
  STEP_TIER_TRACK_RIM_BORDER,
} from "@/lib/utils/activityStepTierVisual";
import { CardioBaselineFrequencyMarkers } from "@/lib/ui/workouts/CardioBaselineFrequencyMarkers";

const BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

/** Six tiers; Peak (index 5) shares Strength “Peak Frequency” / Activity Elite blue palette. */
const CARDIO_LEGEND_TIERS: readonly CardioDistanceTier[] = [
  "very_low",
  "low",
  "active",
  "high",
  "very_high",
  "peak",
];

/** Equal-width tiers (1/6 each) — aligns labels, colors, and {@link cardioBaselineMilesToVisualScale01} progress fills. */
const LEGEND_SEGMENT_FLEX: readonly number[] = [1, 1, 1, 1, 1, 1];

const LEGEND_ACCESSIBILITY_LABEL =
  "Cardio baseline weekly mileage scale with six equal-width bands from Very Low through Peak. Numeric boundaries zero, two point five, seven point five, fifteen, twenty five, and forty plus miles per week. Peak matches Strength Peak Frequency blue.";

export function CardioBaselineFrequencyLegend() {
  const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";
  const rimShadow =
    os === "ios"
      ? {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }
      : os === "android"
        ? { elevation: 1 }
        : {};

  return (
    <View
      style={styles.legendWrap}
      testID="cardio-baseline-frequency-legend"
      accessible
      accessibilityRole="text"
      accessibilityLabel={LEGEND_ACCESSIBILITY_LABEL}
    >
      <View style={styles.legendA11ySubtree} accessibilityElementsHidden importantForAccessibility="no">
        <View style={styles.labelRow}>
          {CARDIO_LEGEND_TIERS.map((tier, i) => (
            <View key={tier} style={[styles.labelCell, { flex: LEGEND_SEGMENT_FLEX[i]! }]}>
              <Text
                style={styles.tierLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                testID={`cardio-baseline-legend-tier-${tier}`}
              >
                {cardioDistanceTierLabel(tier)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.barAndMarkers}>
          <View
            style={[
              styles.trackRim,
              {
                height: BAR_HEIGHT,
                borderRadius: TRACK_RADIUS,
                borderColor: STEP_TIER_TRACK_RIM_BORDER,
                ...rimShadow,
              },
            ]}
          >
            <View style={[styles.segmentRow, { height: BAR_HEIGHT, borderRadius: TRACK_RADIUS }]}>
              {CARDIO_LEGEND_TIERS.map((tier, i) => {
                const tierIdx = i;
                const visual = activityStepTierBarVisual(tierIdx);
                const fillColor = visual?.fillColor ?? "transparent";
                const isFirst = i === 0;
                const isLast = i === CARDIO_LEGEND_TIERS.length - 1;
                return (
                  <View
                    key={tier}
                    style={[
                      styles.segment,
                      { flex: LEGEND_SEGMENT_FLEX[i]! },
                      {
                        backgroundColor: fillColor,
                        borderTopLeftRadius: isFirst ? TRACK_RADIUS : 0,
                        borderBottomLeftRadius: isFirst ? TRACK_RADIUS : 0,
                        borderTopRightRadius: isLast ? TRACK_RADIUS : 0,
                        borderBottomRightRadius: isLast ? TRACK_RADIUS : 0,
                      },
                    ]}
                    importantForAccessibility="no"
                  />
                );
              })}
            </View>
          </View>
          <CardioBaselineFrequencyMarkers />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendWrap: {
    width: "100%",
  },
  legendA11ySubtree: {
    width: "100%",
    gap: 8,
  },
  barAndMarkers: {
    gap: 3,
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
  },
  labelCell: {
    minWidth: 0,
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#636366",
    letterSpacing: -0.08,
    textAlign: "center",
  },
  trackRim: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  segmentRow: {
    flexDirection: "row",
    width: "100%",
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
});
