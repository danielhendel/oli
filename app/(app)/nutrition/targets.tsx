import React, { useLayoutEffect } from "react";
import { Text, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function NutritionTargetsScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Nutrition targets",
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Nutrition Targets" subtitle="Macro & calorie goals">
      <Text style={styles.body}>
        Persisted calorie and macro targets will plug in here and drive Today card progress bars instead of
        static visualization goals. DailyFacts remains the rollup source for actuals.
      </Text>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#3C3C43",
  },
});
