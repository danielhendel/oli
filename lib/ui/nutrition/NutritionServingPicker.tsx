import React, { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import {
  buildServingOptions,
  resolveServing,
  type ResolvedServing,
  type ServingOption,
} from "@/lib/nutrition/servingSelection";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type NutritionServingPickerProps = {
  food: NutritionFoodSearchItemDto;
  selectedOptionKey: string;
  quantityText: string;
  onSelectOption: (key: string) => void;
  onChangeQuantity: (text: string) => void;
};

function confidenceLabel(confidence: number): string | null {
  if (confidence >= 1) return null;
  if (confidence >= 0.7) return "Estimated weight";
  return "Approximate weight";
}

/**
 * Serving picker: a serving-type selector + quantity input that renders live
 * nutrition. All conversion is delegated to {@link resolveServing}
 * (Phase A engine) — this component holds no math.
 */
export function NutritionServingPicker({
  food,
  selectedOptionKey,
  quantityText,
  onSelectOption,
  onChangeQuantity,
}: NutritionServingPickerProps): React.ReactElement {
  const options = useMemo(() => buildServingOptions(food), [food]);
  const selected: ServingOption = useMemo(
    () => options.find((o) => o.key === selectedOptionKey) ?? options[0]!,
    [options, selectedOptionKey],
  );

  const quantity = useMemo(() => {
    const n = Number.parseFloat(quantityText.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, 9999);
  }, [quantityText]);

  const resolved: ResolvedServing = useMemo(
    () => resolveServing(food, selected, quantity),
    [food, selected, quantity],
  );

  const totals = resolved.nutrition;
  const confidenceText = confidenceLabel(resolved.servingConfidence);
  const isLegacy = selected.kind === "legacy";

  const liveSummary = `${Math.round(totals.caloriesKcal)} calories, ${Math.round(
    totals.proteinG,
  )} grams protein, ${Math.round(totals.carbsG)} grams carbs, ${Math.round(totals.fatG)} grams fat${
    totals.fiberG !== undefined ? `, ${Math.round(totals.fiberG)} grams fiber` : ""
  }`;

  const renderOption = useCallback(
    (option: ServingOption) => {
      const isSelected = option.key === selected.key;
      return (
        <Pressable
          key={option.key}
          onPress={() => onSelectOption(option.key)}
          style={({ pressed }) => [
            styles.chip,
            isSelected && styles.chipSelected,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`Serving unit ${option.label}`}
          testID={`serving-option-${option.key}`}
        >
          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
        </Pressable>
      );
    },
    [selected.key, onSelectOption],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{isLegacy ? "Servings" : "Serving"}</Text>
      {isLegacy ? (
        <Text style={styles.legacyHint}>{food.servingLabel}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chipRow}
        >
          {options.map(renderOption)}
        </ScrollView>
      )}

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        value={quantityText}
        onChangeText={onChangeQuantity}
        keyboardType="decimal-pad"
        style={styles.input}
        accessibilityLabel="Serving quantity"
        testID="serving-quantity-input"
      />

      {resolved.grams !== null && !isLegacy ? (
        <Text style={styles.grams} testID="serving-grams">
          {Math.round(resolved.grams)} g{confidenceText ? ` · ${confidenceText}` : ""}
        </Text>
      ) : null}

      <View
        style={styles.summary}
        accessibilityLiveRegion="polite"
        accessibilityLabel={liveSummary}
        testID="serving-nutrition-summary"
      >
        <Text style={styles.summaryText}>
          {Math.round(totals.caloriesKcal)} kcal · P {Math.round(totals.proteinG * 10) / 10} · C{" "}
          {Math.round(totals.carbsG * 10) / 10} · F {Math.round(totals.fatG * 10) / 10}
          {totals.fiberG !== undefined ? ` · Fiber ${Math.round(totals.fiberG * 10) / 10}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY },
  legacyHint: { fontSize: 16, color: UI_TEXT_PRIMARY, marginTop: -4 },
  chipRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    justifyContent: "center",
  },
  chipSelected: { borderColor: SYSTEM_ACCENT, backgroundColor: "rgba(10, 132, 255, 0.14)" },
  chipText: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY },
  chipTextSelected: { color: SYSTEM_ACCENT },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    paddingHorizontal: 12,
    fontSize: 17,
    color: UI_TEXT_PRIMARY,
    backgroundColor: UI_CARD_SURFACE,
  },
  grams: { fontSize: 14, color: UI_TEXT_MUTED },
  summary: { paddingVertical: 4 },
  summaryText: { fontSize: 17, color: UI_TEXT_PRIMARY, fontWeight: "600", lineHeight: 22 },
  pressed: { opacity: 0.65 },
});
