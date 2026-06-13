import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { NutritionLogHub, type NutritionLogHubMode } from "@/lib/ui/nutrition/NutritionLogHub";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { nutritionLogHubHref } from "@/lib/nutrition/nutritionLogHubRoutes";

export default function NutritionLogHubScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Log Nutrition",
    });
  }, [navigation]);

  const onSelectMode = useCallback(
    (mode: NutritionLogHubMode) => {
      router.push(nutritionLogHubHref(mode, dayKey) as Href);
    },
    [router, dayKey],
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
