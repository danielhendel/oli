import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { NutritionSourceBadges } from "@/lib/ui/nutrition/NutritionSourceBadges";
import { useNutritionFoodSearchQuery } from "@/lib/hooks/useNutritionFoodSearchQuery";
import { foodItemMetaFingerprint, useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { useNutritionQuickLog } from "@/lib/hooks/useNutritionQuickLog";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

export default function NutritionSupplementsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  const search = useNutritionFoodSearchQuery();
  const metaApi = useNutritionMeta();
  const quick = useNutritionQuickLog();
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const supplements = useMemo(
    () => search.items.filter((item) => item.productType === "supplement"),
    [search.items],
  );

  const favoriteHashes = useMemo(
    () => new Set((metaApi.meta?.favoriteFoods ?? []).map((f) => f.foodHash)),
    [metaApi.meta?.favoriteFoods],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Supplements",
    });
  }, [navigation]);

  const onOpen = useCallback(
    (item: NutritionFoodSearchItemDto) => {
      router.push({
        pathname: "/(app)/nutrition/food/[foodId]",
        params: { foodId: item.id, day: dayKey },
      });
    },
    [router, dayKey],
  );

  const onQuickLog = useCallback(
    async (item: NutritionFoodSearchItemDto) => {
      setLogMessage(null);
      const r = await quick.quickLog({ kind: "food", food: item }, dayKey, {
        nutritionIngestSource: "search",
      });
      setLogMessage(
        r.ok ? `Logged ${item.servingLabel} ${item.name}` : (quick.errorMessage ?? "Could not log"),
      );
    },
    [quick, dayKey],
  );

  const onToggleFavorite = useCallback(
    (item: NutritionFoodSearchItemDto) => {
      void metaApi.toggleFavorite(item);
    },
    [metaApi],
  );

  return (
    <ModuleScreenShell title="Supplements" subtitle={`Day ${dayKey}`} hideTitleChrome>
      <View style={styles.body}>
        <TextInput
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search supplements"
          placeholderTextColor="#8E8E93"
          returnKeyType="search"
          accessibilityLabel="Supplement search"
          style={styles.input}
        />
        {logMessage != null ? (
          <Text style={styles.logMessage} accessibilityLiveRegion="polite" accessibilityRole="text">
            {logMessage}
          </Text>
        ) : null}

        {search.status === "error" ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorTitle}>Could not load supplements</Text>
            <Text style={styles.errorBody}>{search.errorMessage ?? "Something went wrong."}</Text>
            <Pressable
              onPress={() => search.refresh()}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading supplements"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : search.status === "loading" ? (
          <LoadingState message="Loading supplements…" variant="inline" />
        ) : supplements.length === 0 ? (
          <EmptyState
            title="No supplements found"
            description="Try another name, or scan a barcode for supplement products."
          />
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
            {supplements.map((item) => {
              const fp = foodItemMetaFingerprint(item);
              const isFavorite = favoriteHashes.has(fp);
              const logging = quick.pendingId === item.id;
              return (
                <View key={item.id} style={styles.row} testID={`supplement-row-${item.id}`}>
                  <Pressable
                    onPress={() => onOpen(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.name} to adjust dose`}
                    style={styles.rowMain}
                  >
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {item.brand ? `${item.brand} · ` : ""}
                      {item.servingLabel} · {Math.round(item.caloriesKcal)} kcal
                    </Text>
                    <NutritionSourceBadges
                      source={item.source}
                      productType={item.productType}
                      attributionRequired={item.attributionRequired}
                      compact
                    />
                  </Pressable>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => onToggleFavorite(item)}
                      accessibilityRole="button"
                      accessibilityLabel={isFavorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                      accessibilityState={{ selected: isFavorite }}
                      hitSlop={8}
                      style={({ pressed }) => [styles.starBtn, pressed && styles.pressed]}
                    >
                      <Text style={[styles.star, isFavorite && styles.starOn]}>
                        {isFavorite ? "★" : "☆"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void onQuickLog(item)}
                      disabled={logging}
                      accessibilityRole="button"
                      accessibilityLabel={`Log ${item.servingLabel} ${item.name}`}
                      style={({ pressed }) => [styles.logBtn, (pressed || logging) && styles.pressed]}
                      testID={`supplement-log-${item.id}`}
                    >
                      {logging ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.logBtnText}>Log</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
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
    gap: 12,
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.29)",
    paddingHorizontal: 12,
    fontSize: 17,
    backgroundColor: UI_CARD_SURFACE,
  },
  logMessage: { fontSize: 14, color: "#2E7D32", fontWeight: "600" },
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
  rowMain: { flex: 1, gap: 4 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY },
  rowMeta: { fontSize: 14, color: UI_TEXT_SECONDARY },
  starBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  star: { fontSize: 22, color: "#8E8E93" },
  starOn: { color: "#FF9F0A" },
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
  errorBox: { padding: 16, borderRadius: 12, backgroundColor: "rgba(255, 59, 48, 0.08)", gap: 8 },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#C62828" },
  errorBody: { fontSize: 15, color: "#1C1C1E", lineHeight: 22 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 12 },
  retryText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  pressed: { opacity: 0.65 },
});
