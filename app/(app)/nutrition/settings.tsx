import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

/**
 * Placeholder for future Nutrition preferences (targets, reminders, units).
 * Deliberate non–dead-end: explains status and offers a path back to the module.
 */
export default function NutritionSettingsPlaceholderScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>Nutrition settings coming soon</Text>
        <Text style={styles.bodyText}>
          You will be able to adjust default targets, logging reminders, and display preferences here. For now, use
          Log and Targets from the Nutrition overview.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={() => router.replace("/(app)/nutrition/overview")}
          accessibilityRole="button"
          accessibilityLabel="Go to Nutrition overview"
        >
          <Text style={styles.primaryBtnText}>Open Nutrition overview</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#3C3C43",
  },
  primaryBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: NUTRITION_ACCENT,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
