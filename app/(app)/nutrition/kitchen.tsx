import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { useNutritionPantry } from "@/lib/hooks/useNutritionPantry";
import { useNutritionQuickLog } from "@/lib/hooks/useNutritionQuickLog";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { pantryItemToFood } from "@/lib/nutrition/pantryFood";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { PantryItem } from "@oli/contracts/nutritionPantry";

export default function NutritionKitchenScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const pantry = useNutritionPantry();
  const quick = useNutritionQuickLog();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "My Kitchen",
    });
  }, [navigation]);

  const onAddProduct = useCallback(() => {
    router.push({ pathname: "/(app)/nutrition/search", params: { day: dayKey } });
  }, [router, dayKey]);

  const onQuickLog = useCallback(
    async (item: PantryItem) => {
      setLogMessage(null);
      const r = await quick.quickLog({ kind: "food", food: pantryItemToFood(item) }, dayKey);
      setLogMessage(r.ok ? `Logged ${item.label}` : (quick.errorMessage ?? "Could not log"));
    },
    [quick, dayKey],
  );

  const onRemove = useCallback(
    (id: string, label: string) => {
      Alert.alert("Remove from kitchen?", label, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void pantry.removeItem(id),
        },
      ]);
    },
    [pantry],
  );

  return (
    <ModuleScreenShell title="My Kitchen" hideTitleChrome>
      <View style={styles.body}>
        <Pressable
          onPress={onAddProduct}
          accessibilityRole="button"
          accessibilityLabel="Add product to kitchen"
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          testID="kitchen-add-product"
        >
          <Text style={styles.addBtnText}>Add product</Text>
        </Pressable>

        {logMessage != null ? (
          <Text style={styles.logMessage} accessibilityLiveRegion="polite" accessibilityRole="text">
            {logMessage}
          </Text>
        ) : null}

        {pantry.loading ? (
          <LoadingState message="Loading kitchen…" variant="inline" />
        ) : pantry.items.length === 0 ? (
          <EmptyState
            title="Your kitchen is empty"
            description="Search for store products and add them to My Kitchen for faster logging."
          />
        ) : (
          <View style={styles.list}>
            {pantry.items.map((item) => (
              <View key={item.id} style={styles.row} testID={`kitchen-item-${item.id}`}>
                <Pressable
                  onPress={() => void onQuickLog(item)}
                  disabled={quick.pendingId === item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Quick log ${item.label}`}
                  style={styles.rowCopy}
                  testID={`kitchen-quicklog-${item.id}`}
                >
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowMeta}>
                    {item.servingLabel ? `${item.servingLabel} · ` : ""}
                    {Math.round(item.macrosPerServing.caloriesKcal)} kcal ·{" "}
                    {Math.round(item.macrosPerServing.proteinG)} g protein
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void onQuickLog(item)}
                  disabled={quick.pendingId === item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${item.label}`}
                  style={({ pressed }) => [styles.logBtn, (pressed || quick.pendingId === item.id) && styles.pressed]}
                  testID={`kitchen-log-${item.id}`}
                >
                  {quick.pendingId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.logBtnText}>Log</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => onRemove(item.id, item.label)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.label}`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(84, 84, 88, 0.36)",
    gap: 8,
  },
  rowCopy: { flex: 1, gap: 2, minHeight: 44, justifyContent: "center" },
  rowTitle: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY },
  rowMeta: { fontSize: 14, color: UI_TEXT_SECONDARY },
  logBtn: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  logMessage: { fontSize: 14, color: "#2E7D32", fontWeight: "600" },
  removeBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  removeText: { fontSize: 15, color: "#FF453A", fontWeight: "600" },
});
