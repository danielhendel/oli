import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NutritionMacroSummaryBarModel } from "@/lib/data/nutrition/buildNutritionMacroSummaryBarModel";

export type NutritionMacroSummaryBarProps = {
  model: NutritionMacroSummaryBarModel;
};

export function NutritionMacroSummaryBar({ model }: NutritionMacroSummaryBarProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Text style={styles.headline}>{model.headline}</Text>
      <Text style={styles.detail}>{model.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 4,
  },
  headline: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  detail: {
    fontSize: 14,
    fontWeight: "500",
    color: "#636366",
    lineHeight: 19,
  },
});
