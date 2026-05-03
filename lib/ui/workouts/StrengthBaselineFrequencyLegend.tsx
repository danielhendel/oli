import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import {
  activityStepTierBarVisual,
  STEP_TIER_TRACK_RIM_BORDER,
} from "@/lib/utils/activityStepTierVisual";
import type { StrengthWeeklyFrequencyTierBand } from "@/lib/utils/strengthWeeklyFrequencyRating";
import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
} from "@/lib/utils/strengthWeeklyFrequencyRating";
import { StrengthBaselineFrequencyMarkers } from "@/lib/ui/workouts/StrengthBaselineFrequencyMarkers";

const BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

/** Tier bands 0–5 on the 0→7 workouts/wk scale; segment widths match each band’s numeric span on that ruler. */
const LEGEND_TIER_BANDS: readonly StrengthWeeklyFrequencyTierBand[] = [0, 1, 2, 3, 4, 5];

/** Flex weights: five unit-wide bands plus Peak Frequency spanning markers 5→7 (two units). */
const LEGEND_SEGMENT_FLEX: readonly number[] = [1, 1, 1, 1, 1, 2];

const LEGEND_ACCESSIBILITY_LABEL =
  "Strength baseline scale from zero to seven workouts per week. Six colored bands from Very Low through Peak Frequency; Very High is roughly four to five workouts per week and Peak Frequency from five through seven.";

export function StrengthBaselineFrequencyLegend() {
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
      testID="strength-baseline-frequency-legend"
      accessible
      accessibilityRole="text"
      accessibilityLabel={LEGEND_ACCESSIBILITY_LABEL}
    >
      <View style={styles.legendA11ySubtree} accessibilityElementsHidden importantForAccessibility="no">
        <View style={styles.labelRow}>
          {LEGEND_TIER_BANDS.map((band, i) => (
            <View key={band} style={[styles.labelCell, { flex: LEGEND_SEGMENT_FLEX[i]! }]}>
              <Text
                style={styles.tierLabel}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                testID={`strength-baseline-legend-tier-band-${band}`}
              >
                {strengthWeeklyFrequencyRatingLabelFromTierBand(band)}
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
              {LEGEND_TIER_BANDS.map((band, i) => {
                const tierIdx = strengthWeeklyFrequencyActivityTierIndexForTierBand(band);
                const visual = activityStepTierBarVisual(tierIdx);
                const fillColor = visual?.fillColor ?? "transparent";
                const isFirst = i === 0;
                const isLast = i === LEGEND_TIER_BANDS.length - 1;
                return (
                  <View
                    key={band}
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
          <StrengthBaselineFrequencyMarkers />
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
    gap: 6,
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
