import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DailyNutritionCardModel } from "@/lib/data/dash/buildDailyNutritionCardModel";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
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
  model: DailyNutritionCardModel;
  loading: boolean;
  error: string | null;
  onPress?: () => void;
  /** Consumer card title. Defaults to “Daily Nutrition”. */
  title?: string;
};

export function DailyNutritionCard({
  model,
  loading,
  error,
  onPress,
  title = "Daily Nutrition",
}: Props): React.ReactElement {
  const content = (
    <>
      <Text style={styles.title}>{title}</Text>

      {loading ? <Text style={styles.status}>Loading daily nutrition{"\u2026"}</Text> : null}
      {!loading && error ? <Text style={styles.status}>Could not load daily nutrition</Text> : null}

      {!loading && !error ? (
        <>
          {model.hasAnyNutrition ? (
            <>
              <Text style={styles.calorieValue}>{model.calorieLabel}</Text>
              <Text style={styles.subtitle}>Logged today</Text>
            </>
          ) : (
            <Text style={styles.status}>No nutrition record is available for today.</Text>
          )}

          <View style={styles.factors} accessibilityRole="list">
            {model.rows.map((row) => (
              <View key={row.key} style={styles.factorRow}>
                <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
                <Text style={dashMetricRowValueTextStyle}>{row.valueLabel}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
  );

  if (onPress == null) {
    return (
      <View style={styles.card} accessibilityLabel="Daily nutrition card">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Daily nutrition card"
      accessibilityHint="Opens nutrition page"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID="dash-daily-nutrition-card"
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    marginTop: 12,
    backgroundColor: UI_CARD_SURFACE,
  },
  pressed: { opacity: 0.85 },
  title: strengthMetricCardTitleTextStyle,
  calorieValue: {
    fontSize: 34,
    lineHeight: 40,
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  factors: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minHeight: 44,
  },
});
