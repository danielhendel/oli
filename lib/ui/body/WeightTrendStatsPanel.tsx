import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  SYSTEM_ACCENT_NAVY_DEPTH,
} from "@/lib/ui/theme/systemAccent";
import {
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
 * Premium equal-width Change / High / Low mini-cards under the Weight chart.
 * Presentation only — values come from the selected-range trend model.
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
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: SYSTEM_ACCENT_NAVY_DEPTH,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(91, 140, 255, 0.28)",
  },
  label: {
    color: "rgba(168, 188, 230, 0.78)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
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
    minHeight: 14,
  },
});
