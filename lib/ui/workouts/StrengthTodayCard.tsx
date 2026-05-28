import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DayKey } from "@/lib/ui/calendar/types";
import type { StrengthTodayDetailVm } from "@/lib/data/workouts/strengthTodayDetailVm";
import { STRENGTH_TODAY_DETAIL_MISSING_VALUE } from "@/lib/data/workouts/strengthTodayDetailVm";
import type { WorkoutDetailMuscleExerciseSetCountRow } from "@/lib/data/workouts/workoutDetailMuscleVolume";
import {
  WORKOUT_DETAIL_MUSCLE_GROUP_LABELS,
  type WorkoutDetailMuscleSetCountRow,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import { formatCompletedSetsLabel } from "@/lib/data/workouts/workoutDisplay";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  RECENT_WORKOUT_ROW_META_TEXT_STYLE,
  workoutOverviewInCardHeaderStyles,
} from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_SCREEN_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type StrengthTodayMuscleGroupSelection = {
  muscleGroup: MuscleGroup;
  label: string;
  totalSetCount: number;
  exercises: readonly WorkoutDetailMuscleExerciseSetCountRow[];
};

export type StrengthTodayCardProps = {
  loading: boolean;
  detailVm: StrengthTodayDetailVm | null;
  onPressLog?: () => void;
  /** Fired when a muscle row is tapped (full-row pressable). */
  onSelectMuscleGroup?: (selection: StrengthTodayMuscleGroupSelection) => void;
  /**
   * Fired when the Avg heart rate metric row is tapped. The screen routes to the
   * `strength-today-hr-detail` modal with `{ day }` as URL params (see overview.tsx).
   * No-op when omitted (row stays pressable but doesn't navigate — used in unit tests
   * that don't exercise navigation).
   */
  onPressAvgHeartRate?: (day: DayKey) => void;
  testID?: string;
};

function pillColors(pill: "Completed" | "Rest"): { bg: string; fg: string } {
  if (pill === "Completed") return { bg: "rgba(52, 199, 89, 0.09)", fg: "#2D9D4E" };
  return { bg: UI_SCREEN_BG, fg: UI_TEXT_SECONDARY };
}

function logCtaLabel(loading: boolean, vm: StrengthTodayDetailVm | null): string {
  if (loading || vm == null) return "Log Workout →";
  return vm.status === "completed" ? "Log Another →" : "Log Workout →";
}

function logCtaAccessibilityLabel(loading: boolean, vm: StrengthTodayDetailVm | null): string {
  if (loading || vm == null) return "Log strength workout";
  return vm.status === "completed" ? "Log another strength workout" : "Log strength workout";
}

function metricRowA11y(label: string, value: string): string {
  return `${label}, ${value}`;
}

export function StrengthTodayCard({
  loading,
  detailVm,
  onPressLog,
  onSelectMuscleGroup,
  onPressAvgHeartRate,
  testID = "strength-today-card",
}: StrengthTodayCardProps) {
  const handleSelectMuscleGroup = useCallback(
    (row: WorkoutDetailMuscleSetCountRow) => {
      if (onSelectMuscleGroup == null) return;
      const exercises =
        detailVm != null && detailVm.status === "completed" && detailVm.muscleVolume != null
          ? detailVm.muscleVolume.exercisesByMuscleGroup[row.muscleGroup] ?? []
          : [];
      onSelectMuscleGroup({
        muscleGroup: row.muscleGroup,
        label: WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[row.muscleGroup],
        totalSetCount: row.setCount,
        exercises,
      });
    },
    [detailVm, onSelectMuscleGroup],
  );

  /**
   * Accessibility label composition mirrors the new visual order:
   * Today → pill → hero → subtitle → Duration → Total Volume → muscle rows (between Total Volume
   * and Estimated Calorie Burn) → Estimated Calorie Burn → Avg heart rate.
   */
  const rootA11y = (() => {
    if (loading || detailVm == null) return "Today strength summary. Loading.";
    if (detailVm.status === "rest") {
      return `Today. ${detailVm.pill}. ${detailVm.hero}. ${detailVm.subtitleLine}`;
    }
    const subtitleA11y =
      detailVm.subtitleLine != null && detailVm.subtitleLine.length > 0
        ? ` ${detailVm.subtitleLine}.`
        : "";
    const muscleRows = detailVm.muscleVolume?.rows ?? [];
    const orderedFragments: string[] = [];
    for (const row of detailVm.rows) {
      orderedFragments.push(metricRowA11y(row.label, row.value));
      if (row.id === "totalVolume" && muscleRows.length > 0) {
        for (const m of muscleRows) {
          orderedFragments.push(
            metricRowA11y(
              WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[m.muscleGroup],
              formatCompletedSetsLabel(m.setCount),
            ),
          );
        }
      }
    }
    const rowsA11y = orderedFragments.join(". ");
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
            testID="strength-today-card-log-link"
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
            testID="strength-today-hero"
            accessibilityRole="header"
          >
            {detailVm.hero}
          </Text>
          {detailVm.subtitleLine != null && detailVm.subtitleLine.length > 0 ? (
            <Text
              style={styles.subtitle}
              numberOfLines={2}
              testID="strength-today-subtitle"
            >
              {detailVm.subtitleLine}
            </Text>
          ) : null}

          <View
            style={styles.metricRows}
            testID="strength-today-metric-rows"
            accessibilityRole="list"
          >
            {detailVm.rows.map((row) => {
              const renderedRow =
                row.tappable === true ? (
                  (() => {
                    const navigable = onPressAvgHeartRate != null;
                    return (
                      <Pressable
                        key={row.id}
                        onPress={() => {
                          if (onPressAvgHeartRate != null)
                            onPressAvgHeartRate(detailVm.energyDay);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${row.label} details, ${row.value}`}
                        accessibilityHint="Opens average heart rate details for today's strength session"
                        accessibilityState={{ disabled: !navigable }}
                        disabled={!navigable}
                        testID={`strength-today-metric-row-${row.id}`}
                        style={({ pressed }) => [
                          styles.metricRowPressable,
                          pressed && navigable && styles.metricRowPressed,
                        ]}
                      >
                        <View style={styles.metricRowInner}>
                          <Text
                            style={[dashMetricRowLabelTextStyle, styles.metricRowLabel]}
                            numberOfLines={1}
                          >
                            {row.label}
                          </Text>
                          <View style={styles.metricRowRight}>
                            <Text
                              style={dashMetricRowValueTextStyle}
                              numberOfLines={1}
                              accessibilityElementsHidden
                              importantForAccessibility="no"
                            >
                              {row.value}
                            </Text>
                            <Text
                              style={styles.metricRowChevron}
                              accessibilityElementsHidden
                              importantForAccessibility="no"
                              testID={`strength-today-metric-row-${row.id}-chevron`}
                            >
                              {"\u203A"}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })()
                ) : (
                  <View
                    key={row.id}
                    style={styles.metricRowStatic}
                    testID={`strength-today-metric-row-${row.id}`}
                    accessible
                    accessibilityLabel={metricRowA11y(row.label, row.value)}
                  >
                    <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
                    <Text style={dashMetricRowValueTextStyle}>{row.value}</Text>
                  </View>
                );

              /**
               * Inline the muscle-group rows immediately after the Total Volume row, sharing the
               * same metric-row styling so they align with Duration / Estimated Calorie Burn /
               * Avg HR. Keeps existing `strength-today-working-volume-{muscleGroup}` test IDs,
               * chevrons, and `onSelectMuscleGroup` routing byte-identical.
               */
              if (
                row.id === "totalVolume" &&
                detailVm.muscleVolume != null &&
                detailVm.muscleVolume.rows.length > 0
              ) {
                const muscleNodes = detailVm.muscleVolume.rows.map((muscleRow) => {
                  const label = WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[muscleRow.muscleGroup];
                  const setsLabel = formatCompletedSetsLabel(muscleRow.setCount);
                  return (
                    <Pressable
                      key={`muscle-${muscleRow.muscleGroup}`}
                      onPress={() => handleSelectMuscleGroup(muscleRow)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${label} working volume breakdown, ${setsLabel}`}
                      testID={`strength-today-working-volume-${muscleRow.muscleGroup}`}
                      style={({ pressed }) => [
                        styles.metricRowPressable,
                        pressed && styles.metricRowPressed,
                      ]}
                    >
                      <View style={styles.metricRowInner}>
                        <Text
                          style={[dashMetricRowLabelTextStyle, styles.metricRowLabel]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                        <View style={styles.metricRowRight}>
                          <Text
                            style={dashMetricRowValueTextStyle}
                            numberOfLines={1}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            {setsLabel}
                          </Text>
                          <Text
                            style={styles.metricRowChevron}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            {"\u203A"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                });
                return (
                  <React.Fragment key={row.id}>
                    {renderedRow}
                    {muscleNodes}
                  </React.Fragment>
                );
              }
              return renderedRow;
            })}
          </View>
        </View>
      ) : null}

      {!loading && detailVm != null && detailVm.status === "rest" ? (
        <View style={styles.body}>
          <Text style={styles.heroMetric} numberOfLines={2} testID="strength-today-hero">
            {detailVm.hero}
          </Text>
          <Text style={styles.subtitle} testID="strength-today-subtitle">
            {detailVm.subtitleLine}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Re-exported so tests / callers don't duplicate the unavailable glyph. */
export { STRENGTH_TODAY_DETAIL_MISSING_VALUE };

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
  /**
   * Large, left-aligned hero (workout name). Mirrors Sleep / Activity Today hero typography
   * (`34 / 40 / 700 / -0.2`) so all three Today cards read with the same dominance.
   */
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
  /** Metric-row block (Duration / Total Volume / Estimated Calorie Burn / Avg HR). */
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
  metricRowPressable: {
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: "center",
  },
  metricRowPressed: {
    opacity: 0.75,
  },
  metricRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metricRowLabel: {
    flex: 1,
    minWidth: 0,
  },
  metricRowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  metricRowChevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
