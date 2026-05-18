import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { BuiltBodyCompositionDashCard } from "@/lib/data/dash/buildBodyCompositionDashCardModel";
import type {
  BodyCompositionDashMetricRow,
  BodyCompositionDashMetricRowKey,
} from "@/lib/data/dash/buildBodyCompositionDashCardModel";
import { BODY_METRIC_RANGES_EXPLAINER_HREF } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { InterpretationRatingPill } from "@/lib/ui/body/InterpretationRatingPill";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_GOAL_PILL_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

export type BodyCompositionCardProps = {
  loading: boolean;
  error: string | null;
  hasUser: boolean;
  goalsHref: string;
  built: BuiltBodyCompositionDashCard | null;
};

export function BodyCompositionCard({
  loading,
  error,
  hasUser,
  goalsHref,
  built,
}: BodyCompositionCardProps): React.ReactElement {
  const router = useRouter();

  const onPressGoals = useCallback(() => {
    router.push(goalsHref as Href);
  }, [goalsHref, router]);

  const onPressMetricRow = useCallback(
    (key: BodyCompositionDashMetricRowKey) => {
      router.push({
        pathname: BODY_METRIC_RANGES_EXPLAINER_HREF,
        params: { metric: key },
      });
    },
    [router],
  );

  const cardAccessibilityLabel = ((): string => {
    if (loading) return "Body composition card, loading";
    if (!hasUser) return "Body composition card, sign in to view";
    if (error != null) return "Body composition card, error";
    if (built?.tag === "missing") return built.cardAccessibilityLabel;
    if (built?.tag === "ready") return built.cardAccessibilityLabel;
    return "Body composition card";
  })();

  return (
    <View style={styles.card} accessibilityLabel={cardAccessibilityLabel}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          Body Composition
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My goal, open body composition settings"
          onPress={onPressGoals}
          style={({ pressed }) => [styles.goalsButton, pressed && styles.goalsButtonPressed]}
          testID="body-composition-my-goal"
          hitSlop={8}
        >
          <Text style={styles.goalsButtonText}>My goal</Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.status}>Loading body composition…</Text> : null}

      {!loading && error != null ? (
        <ErrorState variant="inline" title="Could not load body composition" message={error} />
      ) : null}

      {!loading && !hasUser ? (
        <Text style={styles.status}>Sign in to see your body composition.</Text>
      ) : null}

      {!loading && hasUser && error == null && built?.tag === "missing" ? (
        <Text style={styles.status} accessibilityRole="text">
          Add body data to see your composition.
        </Text>
      ) : null}

      {!loading && hasUser && error == null && built?.tag === "ready" ? (
        <>
          <Text style={styles.primaryValue} testID="body-composition-weight-primary">
            {built.weightPrimaryLabel}
          </Text>
          {built.readingAsOfLabel ? (
            <Text style={styles.subtitle} testID="body-composition-reading-as-of">
              {built.readingAsOfLabel}
            </Text>
          ) : null}
          <View style={styles.rowsWrap}>
            {built.rows.map((row) => (
              <MetricRow key={row.key} row={row} onPress={() => onPressMetricRow(row.key)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function MetricRow({
  row,
  onPress,
}: {
  row: BodyCompositionDashMetricRow;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressablePressed]}
      testID={`body-composition-row-${row.key}`}
    >
      <View style={styles.rowTop}>
        <Text style={[dashMetricRowLabelTextStyle, styles.domainLabel]} numberOfLines={1}>
          {row.label}
        </Text>
        <View style={styles.rowRightCluster}>
          <Text style={[dashMetricRowValueTextStyle, styles.rowFigure]} numberOfLines={1}>
            {row.valueLabel}
          </Text>
          <InterpretationRatingPill bar={row.bar} shellStyle={styles.inlinePill} />
          <Text style={styles.rowChevron}>{"\u203A"}</Text>
        </View>
      </View>
    </Pressable>
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
  primaryValue: {
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
  rowsWrap: {
    gap: 6,
    marginTop: 4,
  },
  rowPressable: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
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
    gap: 10,
  },
  domainLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
  rowRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 1,
    maxWidth: "68%",
  },
  rowFigure: {
    flexShrink: 1,
  },
  inlinePill: {
    flexShrink: 0,
    maxWidth: 120,
  },
  rowChevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
