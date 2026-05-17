import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { WeeklyFitnessProgressToGoalVm } from "@/lib/data/dash/buildWeeklyFitnessProgressToGoalVm";
import { weeklyFitnessMetricPageHref } from "@/lib/data/dash/weeklyFitnessRoutes";
import type { UseWeeklyFitnessCardResult, WeeklyFitnessRow } from "@/lib/data/dash/useWeeklyFitnessCard";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { CircularProgressRing } from "@/lib/ui/progress/CircularProgressRing";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_GOAL_PILL_SURFACE,
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";

/** Dash Weekly Fitness hero: larger ring + stroke for readability without crowding the header row. */
const WEEKLY_FITNESS_RING_SIZE = 156;
const WEEKLY_FITNESS_RING_STROKE_WIDTH = 9;

type Props = {
  loading: boolean;
  error: string | null;
  rows: WeeklyFitnessRow[];
  /** Combined Weekly Fitness completion across enabled (goal>0) categories. */
  combined: UseWeeklyFitnessCardResult["combined"];
  /** Right-aligned progress-to-goal summary beside the score ring. */
  progressToGoalVm: WeeklyFitnessProgressToGoalVm;
  /** When false, show copy inviting sign-in instead of metrics. */
  hasUser: boolean;
  /** Route for the "My goal" pressable (Dash Weekly Fitness goals editor). */
  goalsHref: string;
};

function accessibilityLabelForRow(row: WeeklyFitnessRow): string {
  const openAction = `Open ${row.label}`;
  if (!row.hasGoal) {
    return `${row.label}, ${row.accessibilityValueLabel}. ${openAction}`;
  }
  const pct = Math.round(Math.min(1, Math.max(0, row.progress)) * 100);
  return `${row.label}, ${row.accessibilityValueLabel}, ${pct} percent of goal. ${openAction}`;
}

export function WeeklyFitnessCard({
  loading,
  error,
  rows,
  combined,
  progressToGoalVm,
  hasUser,
  goalsHref,
}: Props): React.ReactElement {
  const router = useRouter();

  const onPressMetricRow = useCallback(
    (rowKey: WeeklyFitnessRow["key"]) => {
      router.push(weeklyFitnessMetricPageHref(rowKey));
    },
    [router],
  );

  const onPressGoals = useCallback(() => {
    router.push(goalsHref as Href);
  }, [goalsHref, router]);

  const showCombined = !loading && hasUser && error == null && combined.enabledCategoryCount > 0;
  const showScoreRing = !loading && hasUser && error == null;
  const combinedPercent = showCombined ? Math.max(0, Math.min(100, Math.round(combined.percent))) : null;
  const combinedLabel = combinedPercent == null ? "\u2014" : `${combinedPercent}%`;
  const combinedAccessibility =
    combinedPercent == null
      ? "Weekly Fitness score unavailable."
      : `Weekly Fitness score ${combinedPercent} percent.`;

  return (
    <View style={styles.card} accessibilityLabel="Weekly fitness card">
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          Weekly Fitness
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My goal, edit weekly fitness goals"
          onPress={onPressGoals}
          style={({ pressed }) => [styles.goalsButton, pressed && styles.goalsButtonPressed]}
          testID="weekly-fitness-my-goal"
          hitSlop={8}
        >
          <Text style={styles.goalsButtonText}>My goal</Text>
        </Pressable>
      </View>

      {showScoreRing ? (
        <View style={styles.ringSection} testID="weekly-fitness-combined-ring-section">
          <View style={styles.ringRow}>
            <View style={styles.ringWrap}>
              <CircularProgressRing
                percent={combinedPercent}
                size={WEEKLY_FITNESS_RING_SIZE}
                strokeWidth={WEEKLY_FITNESS_RING_STROKE_WIDTH}
                labelStyle={styles.ringScoreLabel}
                label={combinedLabel}
                trackColor={UI_PROGRESS_TRACK_EMPTY}
                progressColor={WEEKLY_FITNESS_BAR_FILL_COLOR}
                accessibilityLabel={combinedAccessibility}
                testID="weekly-fitness-combined-ring"
              />
            </View>
            <View
              style={styles.progressToGoalBlock}
              accessibilityRole="text"
              accessibilityLabel={progressToGoalVm.accessibilityLabel}
              testID="weekly-fitness-progress-to-goal-block"
            >
              <Text
                style={styles.progressToGoalEyebrow}
                maxFontSizeMultiplier={1.3}
                testID="weekly-fitness-progress-to-goal-eyebrow"
              >
                Progress to goal
              </Text>
              <View style={styles.progressMetricGroup}>
                <Text
                  style={styles.progressToGoalLine}
                  maxFontSizeMultiplier={1.3}
                  testID="weekly-fitness-progress-to-goal-strength-primary"
                >
                  {progressToGoalVm.strength.primary}
                </Text>
                {progressToGoalVm.strength.support.length > 0 ? (
                  <Text
                    style={styles.progressToGoalSupport}
                    maxFontSizeMultiplier={1.25}
                    testID="weekly-fitness-progress-to-goal-strength-support"
                  >
                    {progressToGoalVm.strength.support}
                  </Text>
                ) : null}
              </View>
              <View style={styles.progressMetricGroup}>
                <Text
                  style={styles.progressToGoalLine}
                  maxFontSizeMultiplier={1.3}
                  testID="weekly-fitness-progress-to-goal-activity-primary"
                >
                  {progressToGoalVm.activity.primary}
                </Text>
                {progressToGoalVm.activity.support.length > 0 ? (
                  <Text
                    style={styles.progressToGoalSupport}
                    maxFontSizeMultiplier={1.25}
                    testID="weekly-fitness-progress-to-goal-activity-support"
                  >
                    {progressToGoalVm.activity.support}
                  </Text>
                ) : null}
              </View>
              <View style={styles.progressMetricGroup}>
                <Text
                  style={styles.progressToGoalLine}
                  maxFontSizeMultiplier={1.3}
                  testID="weekly-fitness-progress-to-goal-cardio-primary"
                >
                  {progressToGoalVm.cardio.primary}
                </Text>
                {progressToGoalVm.cardio.support.length > 0 ? (
                  <Text
                    style={styles.progressToGoalSupport}
                    maxFontSizeMultiplier={1.25}
                    testID="weekly-fitness-progress-to-goal-cardio-support"
                  >
                    {progressToGoalVm.cardio.support}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {!loading && hasUser && error == null ? (
        <Text style={styles.subtitle}>This week’s results</Text>
      ) : null}

      {loading ? <Text style={styles.status}>Loading this week’s results…</Text> : null}

      {!loading && error != null ? (
        <ErrorState variant="inline" title="Could not load this week’s data" message={error} />
      ) : null}

      {!loading && !hasUser ? (
        <Text style={styles.status}>Sign in to see your weekly fitness goals.</Text>
      ) : null}

      {!loading && hasUser && error == null ? (
        <View style={styles.rowsWrap} testID="weekly-fitness-rows-wrap">
          {rows.map((row) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabelForRow(row)}
              onPress={() => {
                onPressMetricRow(row.key);
              }}
              style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressablePressed]}
              testID={`weekly-fitness-row-${row.key}`}
            >
              <View style={styles.rowTop}>
                <Text style={styles.domainLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <View style={styles.rowFigureGroup}>
                  <Text
                    style={styles.rowFigure}
                    numberOfLines={1}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    {row.valueLabel}
                  </Text>
                  <Text
                    style={styles.rowChevron}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    testID={`weekly-fitness-row-chevron-${row.key}`}
                  >
                    {"\u203A"}
                  </Text>
                </View>
              </View>
              <View
                style={styles.barTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  now: Math.round(Math.min(1, Math.max(0, row.progress)) * 100),
                  min: 0,
                  max: 100,
                }}
                testID={`weekly-fitness-bar-${row.key}`}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      width: row.hasGoal
                        ? `${Math.round(Math.min(1, Math.max(0, row.progress)) * 100)}%`
                        : "0%",
                      backgroundColor: row.barColor,
                    },
                  ]}
                />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 10,
    marginTop: 12,
    backgroundColor: UI_CARD_SURFACE,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: strengthMetricCardTitleTextStyle,
  /** Left-aligned with card content; breathing room before “This week’s results”. */
  ringSection: {
    alignSelf: "stretch",
    marginTop: 2,
    marginBottom: 6,
  },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: WEEKLY_FITNESS_RING_SIZE,
  },
  ringWrap: {
    flexShrink: 0,
  },
  ringScoreLabel: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.35,
    paddingHorizontal: 8,
  },
  progressToGoalBlock: {
    flex: 1,
    flexGrow: 1,
    minWidth: 0,
    maxWidth: "100%",
    justifyContent: "center",
    alignItems: "flex-end",
    alignSelf: "stretch",
    gap: 6,
    paddingLeft: 4,
  },
  progressMetricGroup: {
    alignItems: "flex-end",
    gap: 1,
    maxWidth: "100%",
  },
  progressToGoalEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.52,
    textTransform: "uppercase",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "right",
  },
  progressToGoalLine: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    textAlign: "right",
    flexShrink: 1,
  },
  progressToGoalSupport: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    letterSpacing: -0.06,
    textAlign: "right",
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginTop: 0,
  },
  goalsButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: UI_GOAL_PILL_SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  goalsButtonPressed: {
    opacity: 0.85,
  },
  goalsButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.08,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  rowsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 10,
    marginTop: 2,
  },
  rowPressable: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  rowPressablePressed: {
    opacity: 0.88,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  domainLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
  },
  rowFigureGroup: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    maxWidth: "62%",
  },
  rowFigure: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
    flexShrink: 1,
    textAlign: "right",
  },
  rowChevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    marginLeft: 0,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: UI_PROGRESS_TRACK_EMPTY,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
});
