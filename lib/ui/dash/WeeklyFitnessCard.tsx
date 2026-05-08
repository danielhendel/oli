import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type {
  WeeklyFitnessRow,
  UseWeeklyFitnessCardResult,
} from "@/lib/data/dash/useWeeklyFitnessCard";
import { WEEKLY_FITNESS_METRIC_EXPLAINER_PATHNAME } from "@/lib/data/energy/energyMetricExplainerRoutes";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  loading: boolean;
  error: string | null;
  rows: WeeklyFitnessRow[];
  /** Combined Weekly Fitness completion across enabled (goal>0) categories. */
  combined: UseWeeklyFitnessCardResult["combined"];
  /** When false, show copy inviting sign-in instead of metrics. */
  hasUser: boolean;
  /** Route for the "My goal" pressable (Dash Weekly Fitness goals editor). */
  goalsHref: string;
};

function accessibilityLabelForRow(row: WeeklyFitnessRow): string {
  if (!row.hasGoal) {
    return `${row.label}, ${row.accessibilityValueLabel}. Opens explanation`;
  }
  const pct = Math.round(Math.min(1, Math.max(0, row.progress)) * 100);
  return `${row.label}, ${row.accessibilityValueLabel}, ${pct} percent of goal. Opens explanation`;
}

export function WeeklyFitnessCard({
  loading,
  error,
  rows,
  combined,
  hasUser,
  goalsHref,
}: Props): React.ReactElement {
  const router = useRouter();

  const onPressExplainer = useCallback(
    (rowKey: WeeklyFitnessRow["key"]) => {
      router.push({
        pathname: WEEKLY_FITNESS_METRIC_EXPLAINER_PATHNAME,
        params: { row: rowKey },
      });
    },
    [router],
  );

  const onPressGoals = useCallback(() => {
    router.push(goalsHref as Href);
  }, [goalsHref, router]);

  const showCombined = !loading && hasUser && error == null && combined.enabledCategoryCount > 0;
  const combinedAccessibility =
    combined.enabledCategoryCount > 0
      ? `${combined.percent} percent of weekly fitness goals completed`
      : undefined;

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

      {showCombined ? (
        <Text
          style={styles.combinedPercent}
          testID="weekly-fitness-combined-percent"
          accessibilityLabel={combinedAccessibility}
        >
          {`${combined.percent}%`}
        </Text>
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
        <View style={styles.rowsWrap}>
          {rows.map((row) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabelForRow(row)}
              onPress={() => {
                onPressExplainer(row.key);
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
  combinedPercent: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginTop: -4,
  },
  goalsButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(120,120,128,0.16)",
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
    gap: 14,
    marginTop: 4,
  },
  rowPressable: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
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
    backgroundColor: "rgba(120,120,128,0.18)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
});
