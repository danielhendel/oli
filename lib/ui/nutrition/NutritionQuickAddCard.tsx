import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TextInput } from "react-native";
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";
import type { buildNutritionQuickAddViewModel } from "@/lib/data/nutrition/buildNutritionQuickAddViewModel";
import { NutritionLogFieldRow } from "@/lib/ui/nutrition/NutritionLogFieldRow";

export type NutritionQuickAddCardProps = {
  quickVm: ReturnType<typeof buildNutritionQuickAddViewModel>;
  onChangeField: (key: keyof NutritionLogFormFields) => (text: string) => void;
  onBlurField: (key: keyof NutritionLogFormFields) => () => void;
  setFocusedIndex: (i: number | null) => void;
  setRef: (index: number) => (el: TextInput | null) => void;
  inputAccessoryViewID?: string;
};

export function NutritionQuickAddCard({
  quickVm,
  onChangeField,
  onBlurField,
  setFocusedIndex,
  setRef,
  inputAccessoryViewID,
}: NutritionQuickAddCardProps) {
  const fiberIndex = quickVm.macroRows.length;
  return (
    <View style={styles.stack}>
      <Text style={styles.lede}>Enter calories and macros for this day.</Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          Macros
        </Text>
        <Text style={styles.groupHint}>All required.</Text>
        {quickVm.macroRows.map((row, i) => (
          <NutritionLogFieldRow
            key={row.key}
            label={row.label}
            unit={row.unit}
            value={row.value}
            onChangeText={onChangeField(row.key)}
            onBlur={onBlurField(row.key)}
            onFocus={() => setFocusedIndex(i)}
            {...(row.error != null ? { error: row.error } : {})}
            inputRef={setRef(i)}
            {...(inputAccessoryViewID != null ? { inputAccessoryViewID } : {})}
            accessibilityLabel={row.accessibilityLabel}
          />
        ))}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          Optional
        </Text>
        <NutritionLogFieldRow
          label="Fiber"
          unit="g"
          value={quickVm.fiber.value}
          onChangeText={onChangeField("fiberG")}
          onBlur={onBlurField("fiberG")}
          onFocus={() => setFocusedIndex(fiberIndex)}
          {...(quickVm.fiber.error != null ? { error: quickVm.fiber.error } : {})}
          inputRef={setRef(fiberIndex)}
          {...(inputAccessoryViewID != null ? { inputAccessoryViewID } : {})}
          accessibilityLabel="Fiber, grams, optional"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  lede: { fontSize: 15, lineHeight: 22, color: "#636366", letterSpacing: -0.2 },
  group: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  groupHint: { fontSize: 14, color: "#636366", marginTop: -8 },
});
