import React from "react";
import { View, Text, StyleSheet, type TextStyle } from "react-native";

import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import type { SleepOliMetricRowModel } from "@/lib/format/sleepOliMetricRows";
import { getSleepMetricProgress, getSleepMetricRating } from "@/lib/format/sleepMetricRowQueries";
import { getSleepMetricColor } from "@/lib/ui/recovery/getSleepMetricColor";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";

export type SleepOliMetricRowProps = {
  row: SleepOliMetricRowModel;
};

const BAR_TOP_SPACING = 10;

/**
 * Single Last night’s sleep metric: label + optional pill + value + semantic progress bar.
 * Presentation only — all values come from the row model + shared color helper.
 */
export function SleepOliMetricRow({ row }: SleepOliMetricRowProps) {
  const rating = getSleepMetricRating(row);
  const progress = getSleepMetricProgress(row);
  const colors = getSleepMetricColor(rating);
  const isPlaceholder = row.valueDisplay === "—";

  return (
    <View
      style={styles.block}
      accessibilityLabel={`${row.label}, ${row.valueDisplay}`}
      accessible
    >
      <View style={styles.topRow}>
        <View style={styles.titleCluster}>
          <Text style={styles.metricLabel} numberOfLines={1} ellipsizeMode="tail">
            {row.label}
          </Text>
          {row.pill != null ? (
            <ActivityRatingPill
              label={row.pill.label}
              color={row.pill.color}
              backgroundColor={row.pill.backgroundColor}
              emphasis="subtle"
              labelTypography={SLEEP_PILL_LABEL_TYPOGRAPHY}
              testID={`sleep-oli-metric-pill-${row.key}`}
            />
          ) : null}
        </View>
        <Text style={[styles.metricValue, isPlaceholder && styles.metricValueMuted]} numberOfLines={1}>
          {row.valueDisplay}
        </Text>
      </View>
      <View style={styles.barWrap}>
        {progress != null ? (
          <LinearProgressBar
            progress={progress}
            height={MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight}
            borderRadius={MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius}
            trackColor={colors.trackColor}
            fillColor={colors.fillColor}
            testID={`sleep-oli-metric-bar-${row.key}`}
          />
        ) : (
          <View style={styles.barPlaceholder} testID={`sleep-oli-metric-bar-${row.key}-empty`} />
        )}
      </View>
    </View>
  );
}

const SLEEP_PILL_LABEL_TYPOGRAPHY: Pick<TextStyle, "fontSize" | "fontWeight" | "letterSpacing"> = {
  fontSize: 13,
  fontWeight: "500",
  letterSpacing: -0.08,
};

const styles = StyleSheet.create({
  block: {
    gap: BAR_TOP_SPACING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    letterSpacing: -0.24,
    flexShrink: 1,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.26,
    flexShrink: 0,
    maxWidth: "42%",
    textAlign: "right",
  },
  metricValueMuted: {
    color: "#AEAEB2",
  },
  barWrap: {
    width: "100%",
  },
  barPlaceholder: {
    height: MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight,
    borderRadius: MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius,
    backgroundColor: "#E5E5EA",
    width: "100%",
  },
});
