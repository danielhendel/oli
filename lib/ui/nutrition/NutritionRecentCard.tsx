import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionRecentCardModel } from "@/lib/data/nutrition/nutritionRecentCardModel";
import type { NutritionRecentRawUi } from "@/lib/hooks/useNutritionOverviewScreenData";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

type NutritionRecentCardProps = {
  model: NutritionRecentCardModel;
  /** Raw-event fetch for the selected day (meal labels). */
  recentRaw: NutritionRecentRawUi;
  hasDayRollup: boolean;
  onViewMore: () => void;
  onEntryPress: (dayKey: string) => void;
  /** Calendar day the rows belong to (selected overview day). */
  dayKey: string;
};

export function NutritionRecentCard({
  model,
  recentRaw,
  hasDayRollup,
  onViewMore,
  onEntryPress,
  dayKey,
}: NutritionRecentCardProps) {
  const loading = recentRaw.readiness === "partial";

  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Recent</Text>
        <Pressable
          onPress={onViewMore}
          accessibilityRole="button"
          accessibilityLabel="View day details"
          hitSlop={8}
          style={({ pressed }) => [
            workoutOverviewInCardHeaderStyles.linkHit,
            pressed && workoutOverviewInCardHeaderStyles.linkPressed,
          ]}
        >
          <Text style={workoutOverviewInCardHeaderStyles.link}>View More</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingState message="Loading meals…" variant="inline" />
      ) : model.rows.length > 0 ? (
        model.rows.map((row, index) => (
          <Pressable
            key={row.id}
            style={({ pressed }) => [
              styles.mealRow,
              index === 0 && styles.mealRowFirst,
              pressed && styles.mealRowPressed,
            ]}
            onPress={() => onEntryPress(dayKey)}
            accessibilityRole="button"
            accessibilityLabel={`${row.title}, ${row.subtitle}`}
          >
            <View style={styles.mealTextCol}>
              <Text style={styles.mealTitle} numberOfLines={2}>
                {row.title}
              </Text>
              <Text style={styles.mealMeta} numberOfLines={1}>
                {row.subtitle}
              </Text>
            </View>
            {row.kcalLabel != null ? (
              <Text style={styles.kcal} numberOfLines={1}>
                {row.kcalLabel}
              </Text>
            ) : null}
          </Pressable>
        ))
      ) : hasDayRollup ? (
        <View style={styles.messageBlock} accessibilityRole="text" testID="nutrition-recent-syncing">
          <Text style={styles.messageTitle}>Meal list syncing</Text>
          <Text style={styles.messageBody}>Your totals are updated. Foods will appear shortly.</Text>
        </View>
      ) : (
        <View style={styles.messageBlock} accessibilityRole="text" testID="nutrition-recent-empty">
          <Text style={styles.messageTitle}>No meals logged yet</Text>
          <Text style={styles.messageBody}>Tap + to log your first meal.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  messageBlock: { gap: 6 },
  messageTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3C3C43",
    letterSpacing: -0.1,
  },
  messageBody: {
    fontSize: 15,
    fontWeight: "400",
    color: "#8E8E93",
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
    minHeight: 56,
  },
  mealRowFirst: {
    borderTopWidth: 0,
    paddingTop: 4,
  },
  mealRowPressed: { opacity: 0.72 },
  mealTextCol: { flex: 1, minWidth: 0, gap: 4 },
  mealTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.28,
    lineHeight: 21,
  },
  mealMeta: {
    fontSize: 13,
    fontWeight: "400",
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
  kcal: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
});
