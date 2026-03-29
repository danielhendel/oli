import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionLoggingMode } from "@/lib/hooks/useNutritionLoggingScreenState";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

const MODES: { id: NutritionLoggingMode; label: string; a11y: string }[] = [
  { id: "quick", label: "Quick Add", a11y: "Quick add daily totals" },
  { id: "meal", label: "Build Meal", a11y: "Build a meal from items" },
  { id: "recent", label: "Recent", a11y: "Recent logging templates" },
];

export type NutritionLoggingModeTabsProps = {
  mode: NutritionLoggingMode;
  onModeChange: (m: NutritionLoggingMode) => void;
};

export function NutritionLoggingModeTabs({ mode, onModeChange }: NutritionLoggingModeTabsProps) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {MODES.map((m) => {
        const selected = mode === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => onModeChange(m.id)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={m.a11y}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tabSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabPressed: { opacity: 0.85 },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#636366",
    textAlign: "center",
  },
  tabTextSelected: {
    color: NUTRITION_ACCENT,
  },
});
