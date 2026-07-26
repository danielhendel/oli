/**
 * Your Pattern — 7 / 30 / 90-day efficiency averages with guideline status.
 * Presentation only; averages and status live on the view model.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepEfficiencyPatternComparison } from "@/lib/data/sleep/buildSleepEfficiencyDetailViewModel";
import type { SleepEfficiencyPatternStatusLabel } from "@/lib/data/sleep/sleepEfficiencyGuideline";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";
import {
  sleepEfficiencyPatternStatusTextColor,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type SleepEfficiencyPatternComparisonProps = {
  pattern: SleepEfficiencyPatternComparison;
  loading?: boolean;
  testID?: string;
};

function PatternRow({
  label,
  value,
  statusLabel,
  accessibilitySummary,
  loading,
  testID,
}: {
  label: string;
  value: string;
  statusLabel: SleepEfficiencyPatternStatusLabel | null;
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
      <View style={styles.rowRight}>
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
        {statusLabel && !loading ? (
          <Text
            style={[
              styles.statusLabel,
              { color: sleepEfficiencyPatternStatusTextColor(statusLabel) },
            ]}
            testID={`${testID}-status`}
          >
            {statusLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function SleepEfficiencyPatternComparisonView({
  pattern,
  loading = false,
  testID = "sleep-efficiency-pattern",
}: SleepEfficiencyPatternComparisonProps): React.ReactElement {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.heading} accessibilityRole="header">
        {pattern.heading}
      </Text>
      <View style={styles.list} testID={`${testID}-list`}>
        <PatternRow
          label={pattern.sevenDay.label}
          value={pattern.sevenDay.value}
          statusLabel={pattern.sevenDay.statusLabel}
          accessibilitySummary={pattern.sevenDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-7d`}
        />
        <PatternRow
          label={pattern.thirtyDay.label}
          value={pattern.thirtyDay.value}
          statusLabel={pattern.thirtyDay.statusLabel}
          accessibilitySummary={pattern.thirtyDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-30d`}
        />
        <PatternRow
          label={pattern.ninetyDay.label}
          value={pattern.ninetyDay.value}
          statusLabel={pattern.ninetyDay.statusLabel}
          accessibilitySummary={pattern.ninetyDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-90d`}
        />
      </View>
    </View>
  );
}

/** Skeleton Your Pattern block while history loads. */
export function SleepEfficiencyPatternComparisonSkeleton({
  testID = "sleep-efficiency-pattern",
}: {
  testID?: string;
}): React.ReactElement {
  const placeholder: SleepEfficiencyPatternComparison = {
    heading: "Your Pattern",
    sevenDay: {
      id: "7d",
      label: "7-day average",
      value: "—",
      statusLabel: null,
      accessibilitySummary: "7-day average. Loading.",
    },
    thirtyDay: {
      id: "30d",
      label: "30-day average",
      value: "—",
      statusLabel: null,
      accessibilitySummary: "30-day average. Loading.",
    },
    ninetyDay: {
      id: "90d",
      label: "90-day average",
      value: "—",
      statusLabel: null,
      accessibilitySummary: "90-day average. Loading.",
    },
  };
  return <SleepEfficiencyPatternComparisonView pattern={placeholder} loading testID={testID} />;
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
  rowRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 4,
    maxWidth: "52%",
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
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  skeletonValue: {
    width: 72,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
