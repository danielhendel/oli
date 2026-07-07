import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BodyTodayCardModel } from "@/lib/data/body/bodyTodayCardModel";
import { formatOverviewAsOfLabel } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyTodayCardProps = {
  loading: boolean;
  model: BodyTodayCardModel | null;
  error?: { message: string; requestId: string | null; onRetry: () => void } | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onPressRow?: (href: string) => void;
  testID?: string;
};

/**
 * Body "Today" card — mirrors {@link ActivityTodayCard}: dominant primary metric (Weight) over a
 * set of clean supporting rows (BMI / Body Fat / Lean Mass). No range/status pills. Rows are
 * tappable (chevron) into the existing metric-detail routes with ≥44px tap targets.
 */
export function BodyTodayCard({
  loading,
  model,
  error,
  emptyTitle = "No body data yet",
  emptyDescription = "When Apple Health has body data, your latest snapshot will appear here.",
  onPressRow,
  testID = "body-today-card",
}: BodyTodayCardProps) {
  const showReady = !loading && error == null && model != null && model.hasAnyMetric;
  const showEmpty = !loading && error == null && (model == null || !model.hasAnyMetric);

  const rootA11y = loading
    ? "Today body composition summary. Loading."
    : error != null
      ? `Today. ${error.message}`
      : showEmpty
        ? `Today. ${emptyTitle}.`
        : `Today body composition. ${model!.weightAccessibilityLabel}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Today
        </Text>
        {showReady && model!.asOfDayKey != null ? (
          <Text
            style={styles.asOfLabel}
            testID="body-today-as-of"
            accessibilityLabel={formatOverviewAsOfLabel(model!.asOfDayKey)}
          >
            {formatOverviewAsOfLabel(model!.asOfDayKey)}
          </Text>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading body data…" /> : null}

      {!loading && error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : null}

      {showEmpty ? (
        <View style={styles.emptyBlock} testID="body-today-empty-state">
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyCopy}>{emptyDescription}</Text>
        </View>
      ) : null}

      {showReady ? (
        <View style={styles.body}>
          <Pressable
            onPress={onPressRow != null ? () => onPressRow(model!.weightHref) : undefined}
            disabled={onPressRow == null}
            accessibilityRole="button"
            accessibilityLabel={model!.weightAccessibilityLabel}
            style={({ pressed }) => [styles.weightRow, pressed && styles.rowPressed]}
            testID="body-today-weight-row"
          >
            <Text style={styles.weightValue} numberOfLines={1} testID="body-today-weight-value">
              {model!.weightValue ?? "\u2014"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={UI_TEXT_SECONDARY} />
          </Pressable>

          <View style={styles.rows}>
            {model!.supportingRows.map((row) => (
              <Pressable
                key={row.key}
                onPress={onPressRow != null ? () => onPressRow(row.href) : undefined}
                disabled={onPressRow == null}
                accessibilityRole="button"
                accessibilityLabel={row.accessibilityLabel}
                style={({ pressed }) => [styles.metricRow, pressed && styles.rowPressed]}
                testID={`body-today-row-${row.key}`}
              >
                <Text style={styles.metricLabel}>{row.label}</Text>
                <View style={styles.metricRight}>
                  <Text
                    style={[styles.metricValue, !row.hasValue && styles.metricValueEmpty]}
                    numberOfLines={1}
                    testID={`body-today-row-${row.key}-value`}
                  >
                    {row.value}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={UI_TEXT_SECONDARY} />
                </View>
              </Pressable>
            ))}
          </View>
          {model!.supportingRows.some((r) => r.hasValue && r.key !== "bmi") ? (
            <Text style={styles.estimateDisclaimer} testID="body-today-estimate-disclaimer">
              Body composition values are estimates unless measured by DEXA.
            </Text>
          ) : null}
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
    paddingBottom: 14,
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
  asOfLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
  body: {
    gap: 4,
    paddingTop: 2,
  },
  weightRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weightValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 4,
  },
  metricRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metricRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  metricValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.22,
    fontVariant: ["tabular-nums"],
  },
  metricValueEmpty: {
    color: "#8E8E93",
  },
  rowPressed: {
    opacity: 0.6,
  },
  emptyBlock: {
    gap: 4,
    paddingVertical: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  emptyCopy: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
  },
  estimateDisclaimer: {
    fontSize: 12,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.05,
    marginTop: 4,
  },
});
