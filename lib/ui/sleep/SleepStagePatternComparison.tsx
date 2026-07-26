/**
 * Your Pattern — 7 / 30 / 90-day stage averages.
 * Presentation only; averages live on the view model.
 * Compact one-line values (`57m · 13%`). No population status labels.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepStagePatternComparison } from "@/lib/data/sleep/buildSleepStageDetailViewModel";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type SleepStagePatternComparisonProps = {
  pattern: SleepStagePatternComparison;
  loading?: boolean;
  testID?: string;
};

function PatternRow({
  label,
  value,
  accessibilitySummary,
  loading,
  testID,
}: {
  label: string;
  value: string;
  accessibilitySummary: string;
  loading?: boolean;
  testID: string;
}): React.ReactElement {
  return (
    <View
      style={styles.row}
      testID={testID}
      accessible
      accessibilityLabel={loading ? `${label}. Loading.` : accessibilitySummary}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {loading ? (
        <View style={styles.skeletonValue} testID={`${testID}-skeleton`} />
      ) : (
        <Text
          style={[styles.rowValue, value === "Not enough data" && styles.rowValueMuted]}
          numberOfLines={2}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

export function SleepStagePatternComparisonView({
  pattern,
  loading = false,
  testID = "sleep-stage-pattern",
}: SleepStagePatternComparisonProps): React.ReactElement {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.heading} accessibilityRole="header">
        {pattern.heading}
      </Text>
      <View style={styles.list} testID={`${testID}-list`}>
        <PatternRow
          label={pattern.sevenDay.label}
          value={pattern.sevenDay.value}
          accessibilitySummary={pattern.sevenDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-7d`}
        />
        <PatternRow
          label={pattern.thirtyDay.label}
          value={pattern.thirtyDay.value}
          accessibilitySummary={pattern.thirtyDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-30d`}
        />
        <PatternRow
          label={pattern.ninetyDay.label}
          value={pattern.ninetyDay.value}
          accessibilitySummary={pattern.ninetyDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-90d`}
        />
      </View>
    </View>
  );
}

/** Skeleton Your Pattern block while history loads. */
export function SleepStagePatternComparisonSkeleton({
  testID = "sleep-stage-pattern",
}: {
  testID?: string;
}): React.ReactElement {
  const placeholder: SleepStagePatternComparison = {
    heading: "Your Pattern",
    sevenDay: {
      id: "7d",
      label: "7-day average",
      value: "—",
      secondaryValue: null,
      accessibilitySummary: "7-day average. Loading.",
    },
    thirtyDay: {
      id: "30d",
      label: "30-day average",
      value: "—",
      secondaryValue: null,
      accessibilitySummary: "30-day average. Loading.",
    },
    ninetyDay: {
      id: "90d",
      label: "90-day average",
      value: "—",
      secondaryValue: null,
      accessibilitySummary: "90-day average. Loading.",
    },
  };
  return <SleepStagePatternComparisonView pattern={placeholder} loading testID={testID} />;
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
  list: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    paddingTop: 2,
  },
  rowValue: {
    flexShrink: 1,
    maxWidth: "52%",
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  rowValueMuted: {
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
  skeletonValue: {
    width: 88,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
