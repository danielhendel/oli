/**
 * Activity-range-explainer-style dotted rows for arbitrary metric bands (Body Composition modals).
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

import type { MetricLegendRowVm } from "@/lib/metrics/metricExplainerVm";

const DOT_SIZE = 7;

function rangeForA11y(range: string): string {
  return range.replace(/\u2013/g, " to ");
}

export type DottedRangeLegendListProps = {
  rows: readonly MetricLegendRowVm[];
  listTestID: string;
  rowTestID: (key: string) => string;
  dotTestID: (key: string) => string;
};

export function DottedRangeLegendList({
  rows,
  listTestID,
  rowTestID,
  dotTestID,
}: DottedRangeLegendListProps): React.ReactElement {
  return (
    <View style={styles.tierList} accessibilityRole="list" testID={listTestID}>
      {rows.map((row) => (
        <View
          key={row.key}
          style={styles.tierRow}
          testID={rowTestID(row.key)}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${row.label}, ${rangeForA11y(row.rangeLine)}`}
        >
          <View
            style={[styles.tierDot, { backgroundColor: row.dotColor }]}
            testID={dotTestID(row.key)}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.tierLine} numberOfLines={3}>
            <Text style={styles.tierLabel}>{row.label}</Text>
            <Text style={styles.tierMeta}>
              {" \u2014 "}
              {row.rangeLine}
            </Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tierList: {
    gap: 14,
    alignSelf: "stretch",
  },
  tierRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tierDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginTop: 6,
    flexShrink: 0,
  },
  tierLine: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.12,
    lineHeight: 23,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  tierMeta: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
  },
});
