import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { useNutritionMealBuilder } from "@/lib/hooks/useNutritionMealBuilder";
import { useNutritionMeals } from "@/lib/hooks/useNutritionMeals";
import { NutritionMealBuilderCard } from "@/lib/ui/nutrition/NutritionMealBuilderCard";
import type { MealItem } from "@oli/contracts/nutritionMeal";

export default function NutritionMealNewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const builder = useNutritionMealBuilder();
  const meals = useNutritionMeals();
  const [mealName, setMealName] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "New meal",
    });
  }, [navigation]);

  const onSaveMeal = useCallback(async () => {
    const name = mealName.trim();
    if (!name) {
      Alert.alert("Name required", "Give your meal a name before saving.");
      return;
    }
    const totals = builder.totalsResult;
    if (!totals.ok) {
      Alert.alert("Invalid meal", totals.error);
      return;
    }
    if (totals.isEmpty) {
      Alert.alert("Add items", "Add at least one item with macros before saving.");
      return;
    }

    const items: MealItem[] = builder.rows.map((row) => ({
      id: row.id,
      label: row.label.trim() || "Item",
      servings: 1,
      macrosPerServing: {
        caloriesKcal: Number(row.calories) || 0,
        proteinG: Number(row.proteinG) || 0,
        carbsG: Number(row.carbsG) || 0,
        fatG: Number(row.fatG) || 0,
      },
    }));

    setSaving(true);
    const saved = await meals.createMeal({ name, items });
    setSaving(false);
    if (saved) {
      router.replace("/(app)/nutrition/meals");
    }
  }, [mealName, builder, meals, router]);

  return (
    <ModuleScreenShell title="New meal" hideTitleChrome>
      <View style={styles.body}>
        <TextInput
          style={styles.nameInput}
          value={mealName}
          onChangeText={setMealName}
          placeholder="Meal name (e.g. Morning oats)"
          placeholderTextColor="#8E8E93"
          accessibilityLabel="Meal name"
        />
        <NutritionMealBuilderCard
          rows={builder.rows}
          onAddRow={builder.addRow}
          onRemoveRow={builder.removeRow}
          onUpdateRow={builder.updateRow}
          mealSubtotalLine={
            builder.totalsResult.ok
              ? `${Math.round(builder.totalsResult.totals.totalKcal)} kcal · P ${Math.round(builder.totalsResult.totals.proteinG)} · C ${Math.round(builder.totalsResult.totals.carbsG)} · F ${Math.round(builder.totalsResult.totals.fatG)}`
              : "—"
          }
          onAddMealToDay={() => ({ ok: false, message: "Save the meal first, then log it from Recent meals." })}
        />
        <Pressable
          onPress={() => void onSaveMeal()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save meal"
          style={({ pressed }) => [styles.saveBtn, (pressed || saving) && styles.pressed]}
          testID="meal-save-button"
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save meal"}</Text>
        </Pressable>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    flexGrow: 1,
    gap: 16,
  },
  nameInput: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 14,
    fontSize: 17,
    color: "#FFFFFF",
  },
  saveBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
