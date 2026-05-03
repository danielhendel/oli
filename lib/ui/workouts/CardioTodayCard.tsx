import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  RECENT_WORKOUT_ROW_META_TEXT_STYLE,
  workoutOverviewInCardHeaderStyles,
} from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

export type CardioTodayCardProps = {
  loading: boolean;
  model: CardioTodayCardModel | null;
  onPressLog?: () => void;
  testID?: string;
};

function pillColors(pill: "Completed" | "No Cardio"): { bg: string; fg: string } {
  if (pill === "Completed") return { bg: "rgba(52, 199, 89, 0.09)", fg: "#2D9D4E" };
  return { bg: "#F2F2F7", fg: "#3C3C43" };
}

function logCtaLabel(loading: boolean, model: CardioTodayCardModel | null): string {
  if (loading || model == null) return "Log Cardio →";
  return model.kind === "completed" ? "Log Another →" : "Log Cardio →";
}

function logCtaAccessibilityLabel(loading: boolean, model: CardioTodayCardModel | null): string {
  if (loading || model == null) return "Log cardio workout";
  return model.kind === "completed" ? "Log another cardio workout" : "Log cardio workout";
}

function rootAccessibilityLabel(loading: boolean, model: CardioTodayCardModel | null): string {
  if (loading || model == null) return "Today cardio summary. Loading.";
  if (model.kind === "rest") {
    return `Today. ${model.pill}. ${model.primaryTitle}. ${model.subtitle}`;
  }
  const parts = model.sessions.map((s) => `${s.primaryLine}. ${s.metaLine}`);
  return `Today. ${model.pill}. ${parts.join(" ")}`;
}

export function CardioTodayCard({
  loading,
  model,
  onPressLog,
  testID = "cardio-today-card",
}: CardioTodayCardProps) {
  return (
    <View
      style={styles.card}
      testID={testID}
      accessible
      accessibilityLabel={rootAccessibilityLabel(loading, model)}
    >
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
            testID="cardio-today-card-log-link"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>{logCtaLabel(loading, model)}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && model != null && model.kind === "completed" ? (
        <View style={styles.body} testID="cardio-today-card-sessions">
          {model.sessions.map((row, idx) => (
            <View
              key={row.sessionId}
              style={[styles.sessionBlock, idx > 0 && styles.sessionBlockSpacing]}
              accessibilityLabel={`${row.primaryLine}. ${row.metaLine}`}
            >
              <Text style={styles.primaryHeadline} numberOfLines={2}>
                {row.primaryLine}
              </Text>
              <Text style={styles.sessionSummaryLine} numberOfLines={2}>
                {row.metaLine}
              </Text>
            </View>
          ))}
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
    backgroundColor: "#FFFFFF",
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
  sessionBlock: {
    gap: 5,
  },
  sessionBlockSpacing: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60, 60, 67, 0.12)",
  },
  primaryHeadline: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: "#000000",
    letterSpacing: -0.38,
  },
  sessionSummaryLine: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
});
