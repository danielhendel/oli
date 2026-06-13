import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { useNutritionMeals } from "@/lib/hooks/useNutritionMeals";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logMealNutrition } from "@/lib/api/usersMe";
import { buildMealNutritionPayload } from "@/lib/nutrition/mealNutritionPayload";
import { getDeviceIanaTimeZone } from "@/lib/events/manualNutrition";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export default function NutritionMealDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { getIdToken } = useAuth();
  const meals = useNutritionMeals();
  const params = useLocalSearchParams<{ mealId?: string | string[]; day?: string | string[] }>();
  const mealId = typeof params.mealId === "string" ? params.mealId : Array.isArray(params.mealId) ? params.mealId[0] : "";
  const dayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  const meal = useMemo(() => meals.items.find((m) => m.id === mealId) ?? null, [meals.items, mealId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: meal?.name ?? "Meal",
    });
  }, [navigation, meal?.name]);

  const onLogMeal = useCallback(async () => {
    if (!meal) return;
    const token = await getIdToken();
    if (!token) {
      Alert.alert("Sign in required", "Sign in to log nutrition.");
      return;
    }
    const payload = buildMealNutritionPayload({
      dayKey,
      timeZone: getDeviceIanaTimeZone(),
      observedAtIso: new Date().toISOString(),
      meal,
    });
    const res = await logMealNutrition(payload, token);
    if (!res.ok) {
      Alert.alert("Could not log meal", res.error ?? "Try again.");
      return;
    }
    router.replace({
      pathname: "/(app)/nutrition",
      params: { logged: "1", day: dayKey },
    });
  }, [meal, getIdToken, router, dayKey]);

  if (meals.loading) {
    return (
      <ModuleScreenShell title="Meal" hideTitleChrome>
        <LoadingState message="Loading meal…" />
      </ModuleScreenShell>
    );
  }

  if (!meal) {
    return (
      <ModuleScreenShell title="Meal" hideTitleChrome>
        <Text style={styles.missing}>Meal not found.</Text>
      </ModuleScreenShell>
    );
  }

  return (
    <ModuleScreenShell title={meal.name} hideTitleChrome>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.hero}>{Math.round(meal.totals.caloriesKcal).toLocaleString()} kcal</Text>
          <Text style={styles.meta}>
            {Math.round(meal.totals.proteinG)} g protein · {Math.round(meal.totals.carbsG)} g carbs ·{" "}
            {Math.round(meal.totals.fatG)} g fat
          </Text>
          {meal.items.map((item) => (
            <Text key={item.id} style={styles.itemLine}>
              {item.label} — {Math.round(item.macrosPerServing.caloriesKcal * item.servings)} kcal
            </Text>
          ))}
        </View>
        <Pressable
          onPress={() => void onLogMeal()}
          accessibilityRole="button"
          accessibilityLabel={`Log ${meal.name}`}
          style={({ pressed }) => [styles.logBtn, pressed && styles.pressed]}
          testID="meal-log-button"
        >
          <Text style={styles.logBtnText}>Log meal</Text>
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
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  hero: { fontSize: 34, fontWeight: "700", color: UI_TEXT_PRIMARY },
  meta: { fontSize: 15, color: UI_TEXT_SECONDARY },
  itemLine: { fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 20 },
  logBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.75 },
  missing: { fontSize: 16, color: UI_TEXT_SECONDARY, padding: 16 },
});
