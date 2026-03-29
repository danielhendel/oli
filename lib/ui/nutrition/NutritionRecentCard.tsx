import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionRecentCardModel } from "@/lib/data/nutrition/nutritionRecentCardModel";
import type { NutritionEventsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatNutritionDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? "";
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${wd} ${month}/${day}`;
}

type NutritionRecentCardProps = {
  model: NutritionRecentCardModel;
  events: NutritionEventsUi;
  onRetryEvents?: () => void;
  onViewMore: () => void;
  onEntryPress: (dayKey: string) => void;
};

export function NutritionRecentCard({ model, events, onRetryEvents, onViewMore, onEntryPress }: NutritionRecentCardProps) {
  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Recent</Text>
        <Pressable
          onPress={onViewMore}
          accessibilityRole="button"
          accessibilityLabel="View nutrition analytics"
          hitSlop={8}
          style={({ pressed }) => [
            workoutOverviewInCardHeaderStyles.linkHit,
            pressed && workoutOverviewInCardHeaderStyles.linkPressed,
          ]}
        >
          <Text style={workoutOverviewInCardHeaderStyles.link}>View More</Text>
        </Pressable>
      </View>
      {events.isLoading ? (
        <LoadingState message="Loading recent logs…" variant="inline" />
      ) : events.readiness === "error" ? (
        <ErrorState
          variant="inline"
          title="Could not load logs"
          message={events.message}
          requestId={events.requestId}
          {...(onRetryEvents != null ? { onRetry: onRetryEvents } : {})}
        />
      ) : model.entries.length === 0 ? (
        <Text style={styles.placeholder}>No nutrition logs yet</Text>
      ) : (
        model.entries.map((entry) => (
          <Pressable
            key={entry.id}
            style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
            onPress={() => onEntryPress(entry.dayKey)}
            accessibilityRole="button"
            accessibilityLabel={`Open nutrition for ${entry.dayKey}`}
          >
            <Text style={styles.recentDate}>{formatNutritionDayLabel(entry.dayKey)}</Text>
            <View style={styles.recentMain}>
              <Text style={styles.recentTitle} numberOfLines={1}>
                {entry.title}
              </Text>
              <Text style={styles.recentMeta} numberOfLines={1}>
                {entry.metaLine}
              </Text>
            </View>
          </Pressable>
        ))
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
  placeholder: { fontSize: 15, fontWeight: "400", color: "#8E8E93", letterSpacing: -0.1 },
  recentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  recentRowPressed: {
    opacity: 0.7,
  },
  recentDate: { width: 84, fontSize: 13, fontWeight: "400", color: "#8E8E93", letterSpacing: -0.1 },
  recentMain: { flex: 1, gap: 2 },
  recentTitle: { fontSize: 15, fontWeight: "500", color: "#1C1C1E", letterSpacing: -0.2 },
  recentMeta: { fontSize: 12, fontWeight: "400", color: "#AEAEB2", letterSpacing: -0.05 },
});
