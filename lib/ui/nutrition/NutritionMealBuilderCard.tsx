import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { MealFoodRow } from "@/lib/data/nutrition/buildNutritionMealBuilderTotals";
import { sanitizeNutritionAmountInput } from "@/lib/nutrition/nutritionLogInput";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
export type NutritionMealBuilderCardProps = {
  rows: MealFoodRow[];
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, patch: Partial<MealFoodRow>) => void;
  mealSubtotalLine: string;
  onAddMealToDay: () => { ok: true } | { ok: false; message: string };
};

export function NutritionMealBuilderCard({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  mealSubtotalLine,
  onAddMealToDay,
}: NutritionMealBuilderCardProps) {
  const [mealHint, setMealHint] = useState<string | null>(null);

  return (
    <View style={styles.stack}>
      <Text style={styles.lede}>
        Add food-style rows with macros. Nothing is saved until you add the meal to your day draft or save the day.
      </Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          Meal items
        </Text>
        {rows.map((row) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHead}>
              <TextInput
                style={styles.nameInput}
                value={row.label}
                onChangeText={(t) => onUpdateRow(row.id, { label: t })}
                placeholder="Label (optional)"
                placeholderTextColor="#AEAEB2"
                accessibilityLabel="Food label optional"
              />
              {rows.length > 1 ? (
                <Pressable
                  onPress={() => onRemoveRow(row.id)}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Remove item"
                  hitSlop={8}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.miniGrid}>
              <MiniField
                label="Cal"
                value={row.calories}
                onChangeText={(t) => onUpdateRow(row.id, { calories: sanitizeNutritionAmountInput(t) })}
              />
              <MiniField
                label="P"
                value={row.proteinG}
                onChangeText={(t) => onUpdateRow(row.id, { proteinG: sanitizeNutritionAmountInput(t) })}
              />
              <MiniField
                label="C"
                value={row.carbsG}
                onChangeText={(t) => onUpdateRow(row.id, { carbsG: sanitizeNutritionAmountInput(t) })}
              />
              <MiniField
                label="F"
                value={row.fatG}
                onChangeText={(t) => onUpdateRow(row.id, { fatG: sanitizeNutritionAmountInput(t) })}
              />
              <MiniField
                label="Fi"
                value={row.fiberG}
                onChangeText={(t) => onUpdateRow(row.id, { fiberG: sanitizeNutritionAmountInput(t) })}
              />
            </View>
          </View>
        ))}

        <Pressable
          onPress={onAddRow}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add another item"
        >
          <Text style={styles.secondaryBtnText}>+ Add item</Text>
        </Pressable>

        <View style={styles.subtotalBox}>
          <Text style={styles.subtotalLabel}>This meal</Text>
          <Text style={styles.subtotalValue}>{mealSubtotalLine}</Text>
        </View>

        {mealHint != null ? (
          <Text style={styles.hint} accessibilityRole="alert">
            {mealHint}
          </Text>
        ) : null}

        <Pressable
          onPress={() => {
            const r = onAddMealToDay();
            if (!r.ok) setMealHint(r.message);
            else setMealHint(null);
          }}
          style={({ pressed }) => [styles.primaryOutline, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add meal totals to day draft"
        >
          <Text style={styles.primaryOutlineText}>Add meal to day</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MiniField(props: { label: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={styles.miniCell}>
      <Text style={styles.miniLab}>{props.label}</Text>
      <TextInput
        style={styles.miniIn}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#AEAEB2"
        accessibilityLabel={`${props.label} grams or calories`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  lede: { fontSize: 15, lineHeight: 22, color: "#636366", letterSpacing: -0.2 },
  group: {
    backgroundColor: UI_CARD_SURFACE,
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
  rowCard: {
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.18)",
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  removeBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  removeText: { fontSize: 16, fontWeight: "600", color: "#FF3B30" },
  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniCell: { width: "18%", minWidth: 56, gap: 4 },
  miniLab: { fontSize: 11, fontWeight: "700", color: "#8E8E93" },
  miniIn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.18)",
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    textAlign: "center",
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600", color: NUTRITION_ACCENT },
  subtotalBox: {
    backgroundColor: "rgba(52, 199, 89, 0.1)",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  subtotalLabel: { fontSize: 13, fontWeight: "700", color: "#3C3C43" },
  subtotalValue: { fontSize: 16, fontWeight: "700", color: "#1C1C1E" },
  hint: { fontSize: 14, color: "#C62828", fontWeight: "500" },
  primaryOutline: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: NUTRITION_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryOutlineText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  pressed: { opacity: 0.88 },
});
