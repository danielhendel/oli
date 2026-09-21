import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

export type WeightTrendStatsRow = {
  readonly key: "average" | "high" | "low";
  readonly label: string;
  readonly value: string;
  readonly testID: string;
};

export type WeightTrendStatsPanelProps = {
  readonly rows: readonly WeightTrendStatsRow[];
};

/**
 * Full-width grouped period statistics — label left / value right.
 * Matches Apple Health connected-sheet language without competing with the hero chart.
 */
export function WeightTrendStatsPanel(props: WeightTrendStatsPanelProps) {
  if (props.rows.length === 0) return null;

  return (
    <View
      style={styles.panel}
      testID="body-metric-trend-summary"
      accessibilityRole="summary"
    >
      {props.rows.map((row, index) => (
        <View key={row.key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View
            style={styles.row}
            testID={row.testID}
            accessible
            accessibilityLabel={`${row.label} ${row.value}`}
          >
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value} numberOfLines={2}>
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: UI_TEXT_MUTED,
    fontSize: 15,
    fontWeight: "500",
    flexShrink: 0,
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
    textAlign: "right",
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginLeft: 16,
  },
});
