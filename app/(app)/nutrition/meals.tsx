import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { useNutritionMeals } from "@/lib/hooks/useNutritionMeals";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export default function NutritionMealsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const meals = useNutritionMeals();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Recent meals",
    });
  }, [navigation]);

  const onCreateMeal = useCallback(() => {
    router.push("/(app)/nutrition/meal/new");
  }, [router]);

  return (
    <ModuleScreenShell title="Recent meals" hideTitleChrome>
      <View style={styles.body}>
        <Pressable
          onPress={onCreateMeal}
          accessibilityRole="button"
          accessibilityLabel="Create new meal"
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          testID="meals-create-new"
        >
          <Text style={styles.addBtnText}>Create meal</Text>
        </Pressable>

        {meals.loading ? (
          <LoadingState message="Loading meals…" variant="inline" />
        ) : meals.items.length === 0 ? (
          <EmptyState
            title="No saved meals yet"
            description="Build a meal you eat often and log it in one tap."
          />
        ) : (
          <View style={styles.list}>
            {meals.items.map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/nutrition/meal/[mealId]",
                    params: { mealId: meal.id, day: dayKey },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Log ${meal.name}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                testID={`meal-row-${meal.id}`}
              >
                <Text style={styles.rowTitle}>{meal.name}</Text>
                <Text style={styles.rowMeta}>
                  {Math.round(meal.totals.caloriesKcal)} kcal · {meal.items.length} items
                </Text>
              </Pressable>
            ))}
          </View>
        )}
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
  addBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.75 },
  list: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    ...elevatedCardSurfaceStyle,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(84, 84, 88, 0.36)",
    gap: 4,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY },
  rowMeta: { fontSize: 14, color: UI_TEXT_SECONDARY },
});
