import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionBaselineModel } from "@/lib/data/nutrition/nutritionBaselineModel";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { UI_BORDER_HAIRLINE, UI_CARD_SURFACE, UI_TEXT_MUTED, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  model: NutritionBaselineModel;
  onPressViewMore?: () => void;
};

export function NutritionBaselineCard({ model, onPressViewMore }: Props) {
  return (
    <View style={styles.card} testID="nutrition-baseline-card">
      <View style={styles.headerRow}>
        <Text style={styles.cardHeading} accessibilityRole="header">
          Nutrition Baseline
        </Text>
        {onPressViewMore != null ? (
          <Pressable
            onPress={onPressViewMore}
            accessibilityRole="button"
            accessibilityLabel="View nutrition analytics"
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
            testID="nutrition-baseline-view-more"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>View More →</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.subtitle} testID="nutrition-baseline-explainer">
        {model.personalizedExplainer}
      </Text>

      <View style={styles.rowsWrap}>
        {model.rows.map((row) => (
          <View key={row.key} style={styles.rowBlock} accessible accessibilityLabel={`${row.label}. ${row.displayValue}.`}>
            <View style={styles.rowTop}>
              <Text style={[dashMetricRowLabelTextStyle, styles.rowLabel]} numberOfLines={1}>
                {row.label}
              </Text>
              <Text
                style={row.hasEnoughData ? dashMetricRowValueTextStyle : styles.rowNonNumeric}
                numberOfLines={1}
              >
                {row.displayValue}
              </Text>
            </View>
            {row.helperText != null ? (
              <Text style={styles.helperText} numberOfLines={2}>
                {row.helperText}
              </Text>
            ) : null}
            <View style={styles.hairline} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeading: strengthMetricCardTitleTextStyle,
  subtitle: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  rowsWrap: { gap: 0, marginTop: 4 },
  rowBlock: { paddingVertical: 8, gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  rowLabel: { flex: 1 },
  rowNonNumeric: { fontSize: 15, color: UI_TEXT_MUTED },
  helperText: { fontSize: 13, color: UI_TEXT_MUTED, lineHeight: 18 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: UI_BORDER_HAIRLINE, marginTop: 4 },
});
