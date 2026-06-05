import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyWeightBaselineDeltaModel } from "@/lib/data/body/bodyWeightBaselineDeltaModel";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const INSUFFICIENT_COPY = "Not enough data";

export type BodyWeightBaselineDeltaCardProps = {
  loading: boolean;
  model: BodyWeightBaselineDeltaModel | null;
  testID?: string;
};

/**
 * Body "Weight Baseline" card — period deltas (7 Day / 30 Day / 90 Day / YTD / 12 Month).
 *
 * Focuses purely on baseline deltas (e.g. `7 Day: +0.7 lb`) — **no colored range/status pills**.
 * Each delta is the latest reading minus the first reading in the period (vs. period start); the
 * row reads "Not enough data" when the period lacks ≥ 2 measured days.
 */
export function BodyWeightBaselineDeltaCard({
  loading,
  model,
  testID = "body-weight-baseline-card",
}: BodyWeightBaselineDeltaCardProps) {
  const rootA11y =
    loading || model == null
      ? "Weight Baseline. Loading."
      : `Weight Baseline. ${model.rows.map((r) => r.accessibilityLabel).join(" ")}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityRole="summary" accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle} numberOfLines={1} accessibilityRole="header">
          Weight Baseline
        </Text>
      </View>

      {loading ? <LoadingState variant="inline" message="Loading weight baseline…" /> : null}

      {!loading && model != null ? (
        <View style={styles.rows} testID="body-weight-baseline-rows">
          {model.rows.map((row) => (
            <View
              key={row.key}
              style={styles.row}
              testID={`body-weight-baseline-row-${row.key}`}
              accessible
              accessibilityLabel={row.accessibilityLabel}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text
                style={[styles.rowValue, !row.hasData && styles.rowValueEmpty]}
                numberOfLines={1}
                testID={`body-weight-baseline-row-${row.key}-value`}
              >
                {row.deltaLabel ?? INSUFFICIENT_COPY}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 6,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  rows: {
    paddingTop: 2,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  rowValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.22,
    fontVariant: ["tabular-nums"],
  },
  rowValueEmpty: {
    fontSize: 14,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
});
