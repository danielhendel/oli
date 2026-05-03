import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  WeeklyInsightItem,
  WeeklyInsightKind,
  WeeklyInsightsCardModel,
} from "@/lib/data/workouts/weeklyInsightsCardModel";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
type WeeklyInsightsCardProps = {
  model: WeeklyInsightsCardModel;
  onInsightPress?: (insight: WeeklyInsightItem) => void;
};

const KIND_LABEL: Record<WeeklyInsightKind, string> = {
  balance: "Balance",
  trend: "Trend",
  focus: "Focus",
};

export function WeeklyInsightsCard({ model, onInsightPress }: WeeklyInsightsCardProps) {
  const showFallback = model.insights.length === 0;

  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Weekly Insights</Text>
      </View>
      {showFallback ? (
        <Text style={styles.fallback}>{model.fallbackMessage}</Text>
      ) : (
        <View style={styles.insightList}>
          {model.insights.map((row, index) => (
            <Pressable
              key={`${row.kind}-${index}`}
              disabled={onInsightPress == null}
              onPress={() => onInsightPress?.(row)}
              style={({ pressed }) => [
                styles.insightRow,
                onInsightPress != null && pressed && styles.insightRowPressed,
              ]}
              accessibilityRole={onInsightPress != null ? "button" : "text"}
              accessibilityState={{ disabled: onInsightPress == null }}
              accessibilityHint={
                onInsightPress != null ? "Opens related Strength Analytics section" : undefined
              }
              accessibilityLabel={`${KIND_LABEL[row.kind]}. ${row.message}`}
            >
              <View
                style={[
                  styles.badge,
                  row.kind === "balance" && styles.badgeBalance,
                  row.kind === "trend" && styles.badgeTrend,
                  row.kind === "focus" && styles.badgeFocus,
                ]}
              >
                <Text style={styles.badgeText}>{KIND_LABEL[row.kind]}</Text>
              </View>
              <Text style={styles.message}>{row.message}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  insightList: {
    gap: 12,
  },
  insightRow: {
    gap: 6,
  },
  insightRowPressed: {
    opacity: 0.72,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: UI_TEXT_PRIMARY,
  },
  badgeBalance: {
    backgroundColor: "rgba(0, 122, 255, 0.12)",
  },
  badgeTrend: {
    backgroundColor: "rgba(52, 199, 89, 0.14)",
  },
  badgeFocus: {
    backgroundColor: "rgba(255, 149, 0, 0.14)",
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_PRIMARY,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  fallback: {
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
});
