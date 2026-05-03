import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { StrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  RECENT_WORKOUT_ROW_META_TEXT_STYLE,
  workoutOverviewInCardHeaderStyles,
} from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import { UI_CARD_SURFACE, UI_SCREEN_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
export type StrengthTodayCardProps = {
  loading: boolean;
  model: StrengthTodayCardModel | null;
  onPressLog?: () => void;
  testID?: string;
};

function pillColors(pill: "Completed" | "Rest"): { bg: string; fg: string } {
  if (pill === "Completed") return { bg: "rgba(52, 199, 89, 0.09)", fg: "#2D9D4E" };
  return { bg: UI_SCREEN_BG, fg: UI_TEXT_SECONDARY };
}

function logCtaLabel(loading: boolean, model: StrengthTodayCardModel | null): string {
  if (loading || model == null) return "Log Workout →";
  return model.kind === "completed" ? "Log Another →" : "Log Workout →";
}

function logCtaAccessibilityLabel(loading: boolean, model: StrengthTodayCardModel | null): string {
  if (loading || model == null) return "Log strength workout";
  return model.kind === "completed" ? "Log another strength workout" : "Log strength workout";
}

export function StrengthTodayCard({ loading, model, onPressLog, testID = "strength-today-card" }: StrengthTodayCardProps) {
  const rootA11y =
    loading || model == null
      ? "Today strength summary. Loading."
      : model.kind === "completed"
        ? `Today. ${model.pill}. ${model.primaryTitle}. ${model.durationLabel}.${model.subtitle.trim() ? ` ${model.subtitle}.` : ""}`
        : `Today. ${model.pill}. ${model.primaryTitle}. ${model.subtitle}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>Today</Text>
        {!loading && model != null ? (
          <View style={[styles.pill, { backgroundColor: pillColors(model.pill).bg }]}>
            <Text style={[styles.pillLabel, { color: pillColors(model.pill).fg }]}>{model.pill}</Text>
          </View>
        ) : null}
        <View style={styles.titleRowSpacer} />
        {onPressLog != null ? (
          <Pressable
            onPress={onPressLog}
            accessibilityRole="button"
            accessibilityLabel={logCtaAccessibilityLabel(loading, model)}
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              styles.logLinkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
            testID="strength-today-card-log-link"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>{logCtaLabel(loading, model)}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && model != null && model.kind === "completed" ? (
        <View style={styles.body}>
          <View style={styles.mainBlock}>
            <View style={styles.titleDurationRow}>
              <Text style={styles.primaryHeadline} numberOfLines={3}>
                {model.primaryTitle}
              </Text>
              <Text
                style={styles.durationFigure}
                numberOfLines={1}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {model.durationLabel}
              </Text>
            </View>
            {model.subtitle.trim().length > 0 ? (
              <Text style={styles.sessionSummaryLine} numberOfLines={2}>
                {model.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!loading && model != null && model.kind === "rest" ? (
        <View style={styles.body}>
          <Text style={styles.primaryHeadline} numberOfLines={2}>
            {model.primaryTitle}
          </Text>
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
    paddingVertical: 13,
    gap: 7,
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
    gap: 0,
  },
  /** Title + duration row, then summary — 5px between (matches This Week title→meta rhythm). */
  mainBlock: {
    gap: 5,
  },
  titleDurationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  primaryHeadline: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    lineHeight: 21,
  },
  durationFigure: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.38,
    flexShrink: 0,
    textAlign: "right",
    paddingTop: 0,
  },
  sessionSummaryLine: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
});
