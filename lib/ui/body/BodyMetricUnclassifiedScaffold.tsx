import React from "react";
import { StyleSheet, View } from "react-native";

import {
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_SHADOW,
  BODY_METRIC_CHART_TRACK_SHEEN,
  BODY_METRIC_SPECTRUM_HEIGHT,
  BODY_METRIC_SPECTRUM_RADIUS,
  BODY_METRIC_UNCLASSIFIED_NEUTRAL_FILL,
  BODY_METRIC_UNCLASSIFIED_NEUTRAL_HIGHLIGHT,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

export type BodyMetricUnclassifiedScaffoldProps = {
  /** Accessibility summary — must state that no classification is shown. */
  accessibilityLabel: string;
  testID?: string;
};

/**
 * Honest neutral measurement rail for metrics without an approved classification.
 * Single restrained tone — no multi-band spectrum that implies risk classes.
 */
export function BodyMetricUnclassifiedScaffold(props: BodyMetricUnclassifiedScaffoldProps) {
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID ?? "body-metric-unclassified-scaffold"}
      style={styles.wrap}
    >
      <View style={styles.markerRail} importantForAccessibility="no" />
      <View
        style={styles.trackGlow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.track}>
          <View
            style={[
              styles.band,
              {
                backgroundColor: BODY_METRIC_UNCLASSIFIED_NEUTRAL_FILL,
                borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
              },
            ]}
          >
            <View
              style={[styles.bandSheen, { backgroundColor: BODY_METRIC_UNCLASSIFIED_NEUTRAL_HIGHLIGHT }]}
            />
          </View>
          <View pointerEvents="none" style={styles.trackSheen} />
        </View>
      </View>
      <View style={styles.labelReserve} importantForAccessibility="no" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  markerRail: {
    height: 40,
  },
  trackGlow: {
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    shadowColor: BODY_METRIC_CHART_TRACK_SHADOW,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  track: {
    flexDirection: "row",
    height: BODY_METRIC_SPECTRUM_HEIGHT,
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  band: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  bandSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "48%",
    opacity: 0.55,
  },
  trackSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BODY_METRIC_CHART_TRACK_SHEEN,
    opacity: 0.12,
  },
  labelReserve: {
    height: 26,
    marginTop: 2,
  },
});
