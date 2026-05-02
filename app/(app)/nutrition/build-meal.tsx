import React, { useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

/**
 * Scaffold only — multi-food “saved meals” are not shipped yet.
 * To log multiple catalog foods for a day, open Food Library from Nutrition.
 */
export default function NutritionBuildMealScaffoldScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Build meal",
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Build meal" subtitle="Coming next" hideTitleChrome>
      <View style={styles.body}>
        <Text style={styles.lead}>
          Build Meal is next: combine multiple foods into one saved meal you can reuse later.
        </Text>
        <Text style={styles.bodyText}>
          For today, add foods from the Food Library to stack catalog items on your day.
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(app)/nutrition/library",
              params: { day: getTodayDayKeyLocal() },
            })
          }
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open food library"
        >
          <Text style={styles.primaryText}>Open Food Library</Text>
        </Pressable>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  lead: { fontSize: 17, fontWeight: "600", color: "#1C1C1E", lineHeight: 24 },
  bodyText: { fontSize: 16, color: "#636366", lineHeight: 22 },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: NUTRITION_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});
