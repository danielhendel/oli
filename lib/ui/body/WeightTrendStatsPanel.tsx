import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

export type WeightTrendStatsRow = {
  readonly key: "change" | "high" | "low";
  readonly label: string;
  readonly value: string;
  readonly caption?: string | null;
  readonly testID: string;
  readonly accessibilityLabel?: string;
};

export type WeightTrendStatsPanelProps = {
  readonly rows: readonly WeightTrendStatsRow[];
};

/**
 * Premium equal-width Low / High / Change mini-cards under the Weight chart.
 * Presentation only — values come from the selected-range trend model.
 * Surfaces match Body Composition elevated cards.
 */
export function WeightTrendStatsPanel(props: WeightTrendStatsPanelProps) {
  if (props.rows.length === 0) return null;

  return (
    <View
      style={styles.panel}
      testID="body-metric-trend-summary"
      accessibilityRole="summary"
    >
      {props.rows.map((row) => (
        <View
          key={row.key}
          style={styles.card}
          testID={row.testID}
          accessible
          accessibilityLabel={
            row.accessibilityLabel ??
            (row.caption ? `${row.label} ${row.value}, ${row.caption}` : `${row.label} ${row.value}`)
          }
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value} numberOfLines={2}>
            {row.value}
          </Text>
          {row.caption ? (
            <Text style={styles.caption} numberOfLines={2}>
              {row.caption}
            </Text>
          ) : (
            <View style={styles.captionSpacer} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 15,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    color: UI_TEXT_MUTED,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    textAlign: "center",
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  caption: {
    color: UI_TEXT_MUTED,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    minHeight: 14,
  },
  captionSpacer: {
    minHeight: 4,
  },
});
