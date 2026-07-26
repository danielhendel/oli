/**
 * Your Pattern — Today vs 7-day vs 30-day comparison rows.
 * Presentation only; classification and averages live on the view model.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepDurationPatternComparison } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type SleepDurationPatternComparisonProps = {
  pattern: SleepDurationPatternComparison;
  /** When true, show skeleton placeholders instead of values. */
  loading?: boolean;
  testID?: string;
};

function PatternRow({
  label,
  value,
  statusLabel,
  coverageLabel,
  emphasized,
  accessibilitySummary,
  loading,
  testID,
}: {
  label: string;
  value: string;
  statusLabel: string | null;
  coverageLabel: string | null;
  emphasized: boolean;
  accessibilitySummary: string;
  loading?: boolean;
  testID: string;
}): React.ReactElement {
  return (
    <View
      style={[styles.row, emphasized && styles.rowEmphasized]}
      testID={testID}
      accessible
      accessibilityLabel={loading ? `${label}. Loading.` : accessibilitySummary}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, emphasized && styles.rowLabelEmphasized]}>{label}</Text>
        {coverageLabel && !loading ? (
          <Text style={styles.coverage}>{coverageLabel}</Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {loading ? (
          <View style={styles.skeletonValue} testID={`${testID}-skeleton`} />
        ) : (
          <Text
            style={[
              styles.rowValue,
              emphasized && styles.rowValueEmphasized,
              value === "Not enough data" && styles.rowValueMuted,
            ]}
            numberOfLines={2}
          >
            {value}
          </Text>
        )}
        {statusLabel && !loading ? (
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function SleepDurationPatternComparisonView({
  pattern,
  loading = false,
  testID = "sleep-duration-pattern",
}: SleepDurationPatternComparisonProps): React.ReactElement {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.heading} accessibilityRole="header">
        {pattern.heading}
      </Text>
      <View style={styles.list}>
        <PatternRow
          label={pattern.today.label}
          value={pattern.today.value}
          statusLabel={pattern.today.statusLabel}
          coverageLabel={pattern.today.coverageLabel}
          emphasized={pattern.today.emphasized}
          accessibilitySummary={pattern.today.accessibilitySummary}
          loading={loading}
          testID={`${testID}-today`}
        />
        <View style={styles.separator} importantForAccessibility="no" />
        <PatternRow
          label={pattern.sevenDay.label}
          value={pattern.sevenDay.value}
          statusLabel={pattern.sevenDay.statusLabel}
          coverageLabel={pattern.sevenDay.coverageLabel}
          emphasized={pattern.sevenDay.emphasized}
          accessibilitySummary={pattern.sevenDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-7d`}
        />
        <View style={styles.separator} importantForAccessibility="no" />
        <PatternRow
          label={pattern.thirtyDay.label}
          value={pattern.thirtyDay.value}
          statusLabel={pattern.thirtyDay.statusLabel}
          coverageLabel={pattern.thirtyDay.coverageLabel}
          emphasized={pattern.thirtyDay.emphasized}
          accessibilitySummary={pattern.thirtyDay.accessibilitySummary}
          loading={loading}
          testID={`${testID}-30d`}
        />
      </View>
    </View>
  );
}

/** Skeleton Your Pattern block while history loads. */
export function SleepDurationPatternComparisonSkeleton({
  testID = "sleep-duration-pattern",
}: {
  testID?: string;
}): React.ReactElement {
  const placeholder: SleepDurationPatternComparison = {
    heading: "Your Pattern",
    today: {
      id: "today",
      label: "Today",
      value: "—",
      statusLabel: null,
      coverageLabel: null,
      emphasized: true,
      accessibilitySummary: "Today. Loading.",
    },
    sevenDay: {
      id: "7d",
      label: "7-day average",
      value: "—",
      statusLabel: null,
      coverageLabel: null,
      emphasized: false,
      accessibilitySummary: "7-day average. Loading.",
    },
    thirtyDay: {
      id: "30d",
      label: "30-day average",
      value: "—",
      statusLabel: null,
      coverageLabel: null,
      emphasized: false,
      accessibilitySummary: "30-day average. Loading.",
    },
  };
  return (
    <SleepDurationPatternComparisonView pattern={placeholder} loading testID={testID} />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  rowEmphasized: {
    paddingTop: 4,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 4,
    maxWidth: "48%",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  rowLabelEmphasized: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  coverage: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  rowValueEmphasized: {
    fontSize: 20,
    fontWeight: "700",
  },
  rowValueMuted: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    textAlign: "right",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
  },
  skeletonValue: {
    width: 72,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
