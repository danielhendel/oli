import React from "react";
import { StyleSheet, View } from "react-native";

import {
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_INNER,
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
        style={styles.trackShell}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.track}>
          {BODY_METRIC_UNCLASSIFIED_SPECTRUM.map((color, index) => {
            const isFirst = index === 0;
            const isLast = index === BODY_METRIC_UNCLASSIFIED_SPECTRUM.length - 1;
            return (
              <View
                key={`tone-${index}`}
                style={[
                  styles.band,
                  {
                    backgroundColor: color,
                    borderTopLeftRadius: isFirst ? 10 : 0,
                    borderBottomLeftRadius: isFirst ? 10 : 0,
                    borderTopRightRadius: isLast ? 10 : 0,
                    borderBottomRightRadius: isLast ? 10 : 0,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
      {/* Reserve label-row height so unclassified cards match Weight vertical rhythm. */}
      <View style={styles.labelReserve} importantForAccessibility="no" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  markerRail: {
    height: 44,
  },
  trackShell: {
    borderRadius: 12,
    padding: 3,
    backgroundColor: BODY_METRIC_CHART_TRACK_INNER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  track: {
    flexDirection: "row",
    height: 28,
    borderRadius: 10,
    overflow: "hidden",
  },
  band: {
    flex: 1,
    height: "100%",
  },
  labelReserve: {
    height: 28,
  },
});
