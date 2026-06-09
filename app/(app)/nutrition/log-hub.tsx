import React, { useCallback, useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { NutritionLogHub, type NutritionLogHubMode } from "@/lib/ui/nutrition/NutritionLogHub";

export default function NutritionLogHubScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Log Nutrition",
    });
  }, [navigation]);

  const onSelectMode = useCallback(
    (mode: NutritionLogHubMode) => {
      switch (mode) {
        case "search":
          router.push("/(app)/nutrition/search");
          break;
        case "kitchen":
          router.push("/(app)/nutrition/kitchen");
          break;
        case "meals":
          router.push("/(app)/nutrition/meals");
          break;
        case "supplements":
          router.push("/(app)/nutrition/supplements");
          break;
        case "manual":
          router.push("/(app)/nutrition/log");
          break;
        case "scan":
          router.push("/(app)/nutrition/scan");
          break;
        default:
          break;
      }
    },
    [router],
  );

  return (
    <ModuleScreenShell title="Log Nutrition" hideTitleChrome>
      <View style={styles.body}>
        <NutritionLogHub onSelectMode={onSelectMode} />
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
  },
});
