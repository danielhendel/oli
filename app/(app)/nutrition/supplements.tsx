import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { useNutritionFoodSearchQuery } from "@/lib/hooks/useNutritionFoodSearchQuery";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export default function NutritionSupplementsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const search = useNutritionFoodSearchQuery();

  const supplements = useMemo(
    () => search.items.filter((item) => item.productType === "supplement"),
    [search.items],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Supplements",
    });
  }, [navigation]);

  const onSelect = useCallback(
    (foodId: string) => {
      router.push({ pathname: "/(app)/nutrition/food/[foodId]", params: { foodId } });
    },
    [router],
  );

  return (
    <ModuleScreenShell title="Supplements" hideTitleChrome>
      <View style={styles.body}>
        {search.status === "loading" ? (
          <LoadingState message="Loading supplements…" variant="inline" />
        ) : supplements.length === 0 ? (
          <EmptyState
            title="No supplements found"
            description="Try product search or scan a barcode for supplement products."
          />
        ) : (
          <View style={styles.list}>
            {supplements.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${item.name}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                testID={`supplement-row-${item.id}`}
              >
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.brand ?? "Supplement"} · {Math.round(item.caloriesKcal)} kcal · {item.servingLabel}
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
  },
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
  pressed: { opacity: 0.75 },
});
