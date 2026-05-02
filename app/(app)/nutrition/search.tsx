import React, { useLayoutEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useNutritionFoodSearchQuery } from "@/lib/hooks/useNutritionFoodSearchQuery";
import { useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { isValidDayKey, type DayKey } from "@/lib/ui/calendar/types";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { NutritionMetaDto } from "@oli/contracts/nutritionMeta";

type FoodRef = NutritionMetaDto["favoriteFoods"][number];

export default function NutritionFoodSearchScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey: DayKey = useMemo(() => {
    const raw = params.day;
    const d = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
    return isValidDayKey(d) ? d : getTodayDayKeyLocal();
  }, [params.day]);

  const search = useNutritionFoodSearchQuery();
  const metaApi = useNutritionMeta();

  const favoriteHashes = useMemo(
    () => new Set((metaApi.meta?.favoriteFoods ?? []).map((f) => f.foodHash)),
    [metaApi.meta?.favoriteFoods],
  );
  const favorites = metaApi.meta?.favoriteFoods ?? [];
  const recentsFiltered = useMemo(
    () => (metaApi.meta?.recentFoods ?? []).filter((r) => !favoriteHashes.has(r.foodHash)),
    [metaApi.meta?.recentFoods, favoriteHashes],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Search food",
    });
  }, [navigation]);

  const onSelect = (item: NutritionFoodSearchItemDto) => {
    router.push({
      pathname: "/(app)/nutrition/food/[foodId]",
      params: { foodId: item.id, day: dayKey },
    });
  };

  const openFoodId = (id: string) => {
    router.push({
      pathname: "/(app)/nutrition/food/[foodId]",
      params: { foodId: id, day: dayKey },
    });
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        {search.status === "loading" ? (
          <View style={styles.loading} accessibilityLabel="Loading search results">
            <ActivityIndicator size="small" color={SYSTEM_ACCENT} />
          </View>
        ) : null}
        {search.status === "error" ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorTitle}>Could not search</Text>
            <Text style={styles.errorBody}>{search.errorMessage ?? "Something went wrong."}</Text>
            <Pressable
              onPress={() => void search.refresh()}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry search"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.searchRow}>
          <TextInput
            value={search.query}
            onChangeText={search.setQuery}
            placeholder="Search the dev food catalog"
            placeholderTextColor="#8E8E93"
            returnKeyType="search"
            accessibilityLabel="Food search"
            style={styles.input}
          />
        </View>
        {!metaApi.loading && favorites.length > 0 ? (
          <View style={styles.metaSection}>
            <Text style={styles.metaHeading}>Favorites</Text>
            <FlatList
              horizontal
              data={favorites}
              keyExtractor={(f: FoodRef) => f.foodHash}
              style={styles.hList}
              contentContainerStyle={styles.chipRow}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: f }) => (
                <Pressable
                  onPress={() => openFoodId(f.id)}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open favorite ${f.name}`}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {f.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
        {!metaApi.loading && recentsFiltered.length > 0 ? (
          <View style={styles.metaSection}>
            <Text style={styles.metaHeading}>Recent</Text>
            <FlatList
              horizontal
              data={recentsFiltered}
              keyExtractor={(r) => `${r.foodHash}-${r.lastUsedAt}`}
              style={styles.hList}
              contentContainerStyle={styles.chipRow}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: r }) => (
                <Pressable
                  onPress={() => openFoodId(r.id)}
                  style={({ pressed }) => [styles.chip, styles.chipMuted, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open recent ${r.name}`}
                >
                  <Text style={styles.chipTextMuted} numberOfLines={1}>
                    {r.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
    ),
    [
      search.status,
      search.errorMessage,
      search.query,
      search.setQuery,
      search.refresh,
      metaApi.loading,
      favorites,
      recentsFiltered,
    ],
  );

  const listEmpty = useMemo(() => {
    if (search.status !== "success" || search.items.length > 0) return null;
    return (
      <View style={styles.centerBox} accessibilityRole="text">
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptyBody}>Try another name or scan a barcode.</Text>
      </View>
    );
  }, [search.status, search.items.length]);

  return (
    <ModuleScreenShell
      title="Search food"
      subtitle={`Day ${dayKey}`}
      hideTitleChrome
      bodyScrollEnabled={false}
    >
      <View style={styles.listWrap}>
        <FlatList
          style={styles.listFill}
          data={search.items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Select food ${item.name}`}
            >
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.brand ? <Text style={styles.rowSub}>{item.brand}</Text> : null}
              <Text style={styles.rowMeta}>
                {item.servingLabel} · {Math.round(item.caloriesKcal)} kcal
              </Text>
            </Pressable>
          )}
        />
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  listWrap: { flex: 1, minHeight: 0 },
  listFill: { flex: 1 },
  headerBlock: { gap: 12, paddingBottom: 8 },
  hList: { minHeight: 44, maxHeight: 48 },
  metaSection: { gap: 8 },
  metaHeading: { fontSize: 13, fontWeight: "600", color: "#636366", letterSpacing: 0.2 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 122, 255, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 122, 255, 0.35)",
  },
  chipMuted: {
    backgroundColor: "rgba(60, 60, 67, 0.06)",
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  chipText: { fontSize: 15, fontWeight: "600", color: SYSTEM_ACCENT },
  chipTextMuted: { fontSize: 15, fontWeight: "500", color: "#1C1C1E" },
  searchRow: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 4 },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.29)",
    paddingHorizontal: 12,
    fontSize: 17,
    backgroundColor: "#FFFFFF",
  },
  loading: { paddingVertical: 12, alignItems: "center" },
  centerBox: { padding: 24, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: "#1C1C1E" },
  emptyBody: { fontSize: 16, color: "#636366", lineHeight: 22 },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 59, 48, 0.08)",
    gap: 8,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#C62828" },
  errorBody: { fontSize: 15, color: "#1C1C1E", lineHeight: 22 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 12 },
  retryText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  row: {
    paddingHorizontal: 0,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60, 60, 67, 0.18)",
    gap: 4,
  },
  rowTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  rowSub: { fontSize: 15, color: "#636366" },
  rowMeta: { fontSize: 13, color: "#8E8E93" },
  pressed: { opacity: 0.65 },
});
