import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { WeeklyFitnessCardModel } from "@/lib/data/dash/buildWeeklyFitnessCardModel";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { WeeklyFitnessHeroCircles } from "@/lib/ui/dash/WeeklyFitnessHeroCircles";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_GOAL_PILL_SURFACE,
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  loading: boolean;
  error: string | null;
  model: WeeklyFitnessCardModel | null;
  /** When false, show copy inviting sign-in instead of metrics. */
  hasUser: boolean;
  /** Route for the "My goal" pressable (Dash Weekly Fitness goals editor). */
  goalsHref: string;
  /**
   * Consumer-visible title. Defaults to “Weekly Fitness” for the Dash rollback path.
   * Program relocation passes “Weekly Progress”.
   */
  title?: string;
  /**
   * Supporting line shown when ready (and not loading/error). When omitted, uses
   * “This week’s results” (legacy Dash copy).
   */
  subtitle?: string;
  /** Root accessibility label. Defaults to legacy “Weekly fitness card”. */
  cardAccessibilityLabel?: string;
};

export function WeeklyFitnessCard({
  loading,
  error,
  model,
  hasUser,
  goalsHref,
  title = "Weekly Fitness",
  subtitle = "This week’s results",
  cardAccessibilityLabel = "Weekly fitness card",
}: Props): React.ReactElement {
  const router = useRouter();

  const onPressGoals = useCallback(() => {
    router.push(goalsHref as Href);
  }, [goalsHref, router]);

  const showHeroes = !loading && hasUser && error == null && model != null;
  const showRows = showHeroes;

  return (
    <View style={styles.card} accessibilityLabel={cardAccessibilityLabel}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
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

      {showHeroes && model ? (
        <WeeklyFitnessHeroCircles
          weeklyProgress={model.weeklyProgress}
          bodyComposition={model.bodyComposition}
        />
      ) : null}

      {!loading && hasUser && error == null ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {loading ? <Text style={styles.status}>Loading this week’s results…</Text> : null}

      {!loading && error != null ? (
        <ErrorState variant="inline" title="Could not load this week’s data" message={error} />
      ) : null}

      {!loading && !hasUser ? (
        <Text style={styles.status}>Sign in to see your weekly fitness goals.</Text>
      ) : null}

      {showRows && model ? (
        <View style={styles.rowsWrap} testID="weekly-fitness-rows-wrap">
          {model.metrics.map((row) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={row.accessibilityLabel}
              onPress={() => {
                router.push(row.href as Href);
              }}
              style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressablePressed]}
              testID={`weekly-fitness-row-${row.key}`}
            >
              <View style={styles.rowTop}>
                <Text style={[dashMetricRowLabelTextStyle, styles.domainLabel]} numberOfLines={1}>
                  {row.label}
                </Text>
                <View style={styles.rowFigureGroup}>
                  <Text
                    style={[dashMetricRowValueTextStyle, styles.rowFigure]}
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
                accessibilityValue={
                  row.hasProgress && row.progress01 != null
                    ? {
                        now: Math.round(Math.min(1, Math.max(0, row.progress01)) * 100),
                        min: 0,
                        max: 100,
                      }
                    : { min: 0, max: 100 }
                }
                testID={`weekly-fitness-bar-${row.key}`}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      width: row.hasProgress
                        ? `${Math.round(Math.min(1, Math.max(0, row.progress01 ?? 0)) * 100)}%`
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
    paddingTop: 4,
    gap: 6,
    marginTop: 2,
  },
  rowPressable: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
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
    flexShrink: 1,
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
