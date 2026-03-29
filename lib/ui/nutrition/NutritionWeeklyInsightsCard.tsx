import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  NutritionWeeklyInsightItem,
  NutritionWeeklyInsightKind,
  NutritionWeeklyInsightsModel,
} from "@/lib/data/nutrition/nutritionWeeklyInsightsModel";
import type { NutritionEventsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";

type NutritionWeeklyInsightsCardProps = {
  model: NutritionWeeklyInsightsModel;
  events: NutritionEventsUi;
  onRetryEvents?: () => void;
  onInsightPress?: (insight: NutritionWeeklyInsightItem) => void;
};

const KIND_LABEL: Record<NutritionWeeklyInsightKind, string> = {
  trend: "Trend",
  focus: "Focus",
  consistency: "Rhythm",
};

export function NutritionWeeklyInsightsCard({ model, events, onRetryEvents, onInsightPress }: NutritionWeeklyInsightsCardProps) {
  const showFallback = model.insights.length === 0;

  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Weekly Insights</Text>
      </View>
      {events.isLoading ? (
        <LoadingState message="Loading insights…" variant="inline" />
      ) : events.readiness === "error" ? (
        <ErrorState
          variant="inline"
          title="Could not load insights"
          message={events.message}
          requestId={events.requestId}
          {...(onRetryEvents != null ? { onRetry: onRetryEvents } : {})}
        />
      ) : showFallback ? (
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
                onInsightPress != null ? "Opens Nutrition analytics" : undefined
              }
              accessibilityLabel={`${KIND_LABEL[row.kind]}. ${row.message}`}
            >
              <View
                style={[
                  styles.badge,
                  row.kind === "trend" && styles.badgeTrend,
                  row.kind === "focus" && styles.badgeFocus,
                  row.kind === "consistency" && styles.badgeConsistency,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
    color: "#3C3C43",
  },
  badgeTrend: {
    backgroundColor: "rgba(52, 199, 89, 0.14)",
  },
  badgeFocus: {
    backgroundColor: "rgba(255, 149, 0, 0.14)",
  },
  badgeConsistency: {
    backgroundColor: "rgba(175, 82, 222, 0.12)",
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1C1C1E",
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  fallback: {
    fontSize: 15,
    fontWeight: "500",
    color: "#636366",
    lineHeight: 21,
    letterSpacing: -0.2,
  },
});
