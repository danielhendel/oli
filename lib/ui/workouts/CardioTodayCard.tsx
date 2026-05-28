import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  CARDIO_TODAY_DETAIL_MISSING_VALUE,
  type CardioTodayDetailVm,
} from "@/lib/data/workouts/cardioTodayDetailVm";
import { LoadingState } from "@/lib/ui/ScreenStates";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  RECENT_WORKOUT_ROW_META_TEXT_STYLE,
  workoutOverviewInCardHeaderStyles,
} from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_SCREEN_BG,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type CardioTodayCardProps = {
  loading: boolean;
  detailVm: CardioTodayDetailVm | null;
  onPressLog?: () => void;
  testID?: string;
};

function pillColors(pill: "Completed" | "No Cardio"): { bg: string; fg: string } {
  if (pill === "Completed") return { bg: "rgba(52, 199, 89, 0.09)", fg: "#2D9D4E" };
  return { bg: UI_SCREEN_BG, fg: UI_TEXT_SECONDARY };
}

function logCtaLabel(loading: boolean, vm: CardioTodayDetailVm | null): string {
  if (loading || vm == null) return "Log Cardio →";
  return vm.status === "completed" ? "Log Another →" : "Log Cardio →";
}

function logCtaAccessibilityLabel(loading: boolean, vm: CardioTodayDetailVm | null): string {
  if (loading || vm == null) return "Log cardio workout";
  return vm.status === "completed" ? "Log another cardio workout" : "Log cardio workout";
}

function metricRowA11y(label: string, value: string): string {
  return `${label}, ${value}`;
}

/**
 * Cardio Today card — mirrors {@link StrengthTodayCard} layout: header (Today + pill + Log CTA),
 * large left-aligned hero (Apple Health modality), optional `+N more sessions` subtitle, and
 * a static metric-row block under a hairline. All row content comes from
 * {@link CardioTodayDetailVm}; this component is purely presentational.
 */
export function CardioTodayCard({
  loading,
  detailVm,
  onPressLog,
  testID = "cardio-today-card",
}: CardioTodayCardProps) {
  const rootA11y = (() => {
    if (loading || detailVm == null) return "Today cardio summary. Loading.";
    if (detailVm.status === "rest") {
      return `Today. ${detailVm.pill}. ${detailVm.hero}. ${detailVm.subtitleLine}`;
    }
    const subtitleA11y =
      detailVm.subtitleLine != null && detailVm.subtitleLine.length > 0
        ? ` ${detailVm.subtitleLine}.`
        : "";
    const rowsA11y = detailVm.rows.map((r) => metricRowA11y(r.label, r.value)).join(". ");
    return `Today. ${detailVm.pill}. ${detailVm.hero}.${subtitleA11y} ${rowsA11y}.`;
  })();

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Today
        </Text>
        {!loading && detailVm != null ? (
          <View style={[styles.pill, { backgroundColor: pillColors(detailVm.pill).bg }]}>
            <Text style={[styles.pillLabel, { color: pillColors(detailVm.pill).fg }]}>
              {detailVm.pill}
            </Text>
          </View>
        ) : null}
        <View style={styles.titleRowSpacer} />
        {onPressLog != null ? (
          <Pressable
            onPress={onPressLog}
            accessibilityRole="button"
            accessibilityLabel={logCtaAccessibilityLabel(loading, detailVm)}
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              styles.logLinkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
            testID="cardio-today-card-log-link"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>
              {logCtaLabel(loading, detailVm)}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && detailVm != null && detailVm.status === "completed" ? (
        <View style={styles.body}>
          <Text
            style={styles.heroMetric}
            numberOfLines={2}
            testID="cardio-today-hero"
            accessibilityRole="header"
          >
            {detailVm.hero}
          </Text>
          {detailVm.subtitleLine != null && detailVm.subtitleLine.length > 0 ? (
            <Text style={styles.subtitle} numberOfLines={2} testID="cardio-today-subtitle">
              {detailVm.subtitleLine}
            </Text>
          ) : null}

          <View
            style={styles.metricRows}
            testID="cardio-today-metric-rows"
            accessibilityRole="list"
          >
            {detailVm.rows.map((row) => (
              <View
                key={row.id}
                style={styles.metricRowStatic}
                testID={`cardio-today-metric-row-${row.id}`}
                accessible
                accessibilityLabel={metricRowA11y(row.label, row.value)}
              >
                <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
                <Text style={dashMetricRowValueTextStyle}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!loading && detailVm != null && detailVm.status === "rest" ? (
        <View style={styles.body}>
          <Text style={styles.heroMetric} numberOfLines={2} testID="cardio-today-hero">
            {detailVm.hero}
          </Text>
          <Text style={styles.subtitle} testID="cardio-today-subtitle">
            {detailVm.subtitleLine}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export { CARDIO_TODAY_DETAIL_MISSING_VALUE };

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
    gap: 7,
    flexWrap: "wrap",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: "center",
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.06,
  },
  titleRowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 8,
  },
  logLinkHit: {
    minHeight: 44,
    justifyContent: "center",
  },
  body: {
    gap: 8,
    paddingTop: 2,
  },
  /** Large, left-aligned hero (Apple Health modality). Matches Strength Today typography. */
  heroMetric: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
  metricRows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
  metricRowStatic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 7,
    minHeight: 36,
  },
});
