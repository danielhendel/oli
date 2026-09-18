import React from "react";
import { StyleSheet, View } from "react-native";

import {
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_SHADOW,
  BODY_METRIC_CHART_TRACK_SHEEN,
  BODY_METRIC_SPECTRUM_HEIGHT,
  BODY_METRIC_SPECTRUM_RADIUS,
  BODY_METRIC_UNCLASSIFIED_SPECTRUM,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

export type BodyMetricUnclassifiedScaffoldProps = {
  /** Accessibility summary — must state that no classification is shown. */
  accessibilityLabel: string;
  testID?: string;
};

/**
 * Premium visual continuum for metrics without an approved classification standard.
 * Matches Weight card chart rhythm without claiming scientific bands or markers.
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
          {BODY_METRIC_UNCLASSIFIED_SPECTRUM.map((tone, index) => {
            const isFirst = index === 0;
            const isLast = index === BODY_METRIC_UNCLASSIFIED_SPECTRUM.length - 1;
            return (
              <View
                key={`tone-${index}`}
                style={[
                  styles.band,
                  {
                    backgroundColor: tone.fill,
                    borderTopLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderTopRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                  },
                ]}
              >
                <View style={[styles.bandSheen, { backgroundColor: tone.highlight }]} />
              </View>
            );
          })}
          <View pointerEvents="none" style={styles.trackSheen} />
        </View>
      </View>
      {/* Reserve label-row height so unclassified cards match Weight vertical rhythm. */}
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
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    opacity: 0.8,
  },
  trackSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BODY_METRIC_CHART_TRACK_SHEEN,
    opacity: 0.16,
  },
  labelReserve: {
    height: 26,
    marginTop: 2,
  },
});
