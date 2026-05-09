import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DailyNutritionCardModel } from "@/lib/data/dash/buildDailyNutritionCardModel";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  model: DailyNutritionCardModel;
  loading: boolean;
  error: string | null;
};

export function DailyNutritionCard({ model, loading, error }: Props): React.ReactElement {
  return (
    <View style={styles.card} accessibilityLabel="Daily nutrition card">
      <Text style={styles.title}>Daily Nutrition</Text>

      {loading ? <Text style={styles.status}>Loading daily nutrition…</Text> : null}
      {!loading && error ? <Text style={styles.status}>Could not load daily nutrition</Text> : null}

      {!loading && !error ? (
        <>
          {model.hasAnyNutrition ? (
            <>
              <Text style={styles.calorieValue}>{model.calorieLabel}</Text>
              <Text style={styles.subtitle}>Logged today</Text>
            </>
          ) : (
            <Text style={styles.status}>No nutrition logged today</Text>
          )}

          <View style={styles.factors} accessibilityRole="list">
            {model.rows.map((row) => (
              <View key={row.key} style={styles.factorRow}>
                <Text style={styles.factorLabel}>{row.label}</Text>
                <Text style={styles.factorValue}>{row.valueLabel}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
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
    paddingTop: 8,
    gap: 4,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 10,
    minHeight: 44,
  },
  factorLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    fontWeight: "500",
  },
  factorValue: {
    fontSize: 15,
    lineHeight: 20,
    color: UI_TEXT_PRIMARY,
    fontWeight: "600",
    textAlign: "right",
  },
});
