import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useNutritionFoodSearchQuery } from "@/lib/hooks/useNutritionFoodSearchQuery";
import { useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { useNutritionQuickLog } from "@/lib/hooks/useNutritionQuickLog";
import { type DayKey } from "@/lib/ui/calendar/types";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { NutritionSourceBadges } from "@/lib/ui/nutrition/NutritionSourceBadges";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_SURFACE_PRESSED,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type QuickChip = {
  key: string;
  id: string;
  name: string;
  foodHash: string;
  favorite: boolean;
};

export default function NutritionFoodSearchScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey: DayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  const search = useNutritionFoodSearchQuery();
  const metaApi = useNutritionMeta();
  const quick = useNutritionQuickLog();
  const [quickMessage, setQuickMessage] = useState<string | null>(null);

  const quickLogRef = useCallback(
    async (id: string, name: string) => {
      setQuickMessage(null);
      const r = await quick.quickLog({ kind: "ref", id }, dayKey);
      setQuickMessage(r.ok ? `Logged ${name}` : (quick.errorMessage ?? "Could not log"));
    },
    [quick, dayKey],
  );

  const favoriteHashes = useMemo(
    () => new Set((metaApi.meta?.favoriteFoods ?? []).map((f) => f.foodHash)),
    [metaApi.meta?.favoriteFoods],
  );
  const favorites = metaApi.meta?.favoriteFoods ?? [];
  const recentsFiltered = useMemo(
    () => (metaApi.meta?.recentFoods ?? []).filter((r) => !favoriteHashes.has(r.foodHash)),
    [metaApi.meta?.recentFoods, favoriteHashes],
  );

  const isBrowsing = search.query.trim().length === 0;
  const quickChips: QuickChip[] = useMemo(() => {
    if (!isBrowsing) return [];
    return [
      ...favorites.map((f) => ({
        key: `fav-${f.foodHash}`,
        id: f.id,
        name: f.name,
        foodHash: f.foodHash,
        favorite: true,
      })),
      ...recentsFiltered.map((r) => ({
        key: `rec-${r.foodHash}-${r.lastUsedAt}`,
        id: r.id,
        name: r.name,
        foodHash: r.foodHash,
        favorite: false,
      })),
    ];
  }, [isBrowsing, favorites, recentsFiltered]);

  const showQuickAccess = !metaApi.loading && (quickChips.length > 0 || isBrowsing);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Search food",
    });
  }, [navigation]);

  const onSelect = useCallback(
    (item: NutritionFoodSearchItemDto) => {
      router.push({
        pathname: "/(app)/nutrition/food/[foodId]",
        params: { foodId: item.id, day: dayKey },
      });
    },
    [router, dayKey],
  );

  const goKitchen = useCallback(() => {
    router.push({ pathname: "/(app)/nutrition/kitchen", params: { day: dayKey } });
  }, [router, dayKey]);

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
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

        {showQuickAccess ? (
          <View style={styles.quickSection}>
            <Text style={styles.sectionHeading}>Quick add</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chipRow}
            >
              {quickChips.map((chip) => {
                const pending = quick.pendingId === chip.id;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => void quickLogRef(chip.id, chip.name)}
                    disabled={pending}
                    style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Quick log ${chip.name}`}
                    testID={`quickadd-chip-${chip.foodHash}`}
                  >
                    {chip.favorite ? (
                      <Ionicons name="star" size={13} color={SYSTEM_ACCENT} style={styles.chipIcon} />
                    ) : (
                      <Ionicons name="time-outline" size={14} color={UI_TEXT_MUTED} style={styles.chipIcon} />
                    )}
                    <Text style={styles.chipText} numberOfLines={1}>
                      {chip.name}
                    </Text>
                    {pending ? (
                      <ActivityIndicator size="small" color={UI_TEXT_SECONDARY} style={styles.chipSpinner} />
                    ) : (
                      <Ionicons name="add" size={16} color={UI_TEXT_SECONDARY} style={styles.chipAdd} />
                    )}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={goKitchen}
                style={({ pressed }) => [styles.kitchenChip, pressed && styles.chipPressed]}
                accessibilityRole="button"
                accessibilityLabel="Open My Kitchen"
                testID="quickadd-kitchen"
              >
                <Ionicons name="home-outline" size={14} color={SYSTEM_ACCENT} style={styles.chipIcon} />
                <Text style={styles.kitchenChipText}>My Kitchen</Text>
                <Ionicons name="chevron-forward" size={14} color={SYSTEM_ACCENT} />
              </Pressable>
            </ScrollView>
          </View>
        ) : null}

        {search.status === "success" && search.items.length > 0 ? (
          <View style={styles.resultsHeaderRow}>
            <Text style={styles.sectionHeading}>{isBrowsing ? "Suggested" : "Results"}</Text>
          </View>
        ) : null}
      </View>
    ),
    [
      search.status,
      search.errorMessage,
      search.refresh,
      search.items.length,
      showQuickAccess,
      quickChips,
      quick.pendingId,
      quickLogRef,
      goKitchen,
      isBrowsing,
    ],
  );

  const listEmpty = useMemo(() => {
    if (search.status === "loading") {
      return (
        <View style={styles.centerBox} accessibilityLabel="Loading search results">
          <ActivityIndicator size="small" color={SYSTEM_ACCENT} />
        </View>
      );
    }
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
        <View style={styles.searchHeader}>
          <View style={styles.searchField}>
            <Ionicons name="search" size={18} color={UI_TEXT_MUTED} />
            <TextInput
              value={search.query}
              onChangeText={search.setQuery}
              placeholder="Search foods, brands, and supplements"
              placeholderTextColor={UI_TEXT_MUTED}
              returnKeyType="search"
              accessibilityLabel="Food search"
              style={styles.input}
              clearButtonMode="while-editing"
            />
          </View>
          {quickMessage != null ? (
            <Text
              style={styles.quickMessage}
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
            >
              {quickMessage}
            </Text>
          ) : null}
        </View>

        <FlatList
          style={styles.listFill}
          data={search.items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.servingLabel}, ${Math.round(
                item.caloriesKcal,
              )} calories. Opens serving options.`}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.brand ? `${item.brand} · ` : ""}
                  {item.servingLabel} · {Math.round(item.caloriesKcal)} kcal
                </Text>
                <NutritionSourceBadges
                  source={item.source}
                  productType={item.productType}
                  attributionRequired={item.attributionRequired}
                  compact
                />
              </View>
              <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
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

  searchHeader: { paddingBottom: 12, gap: 8 },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
  },
  input: { flex: 1, fontSize: 17, color: UI_TEXT_PRIMARY, paddingVertical: 0 },
  quickMessage: { fontSize: 14, color: "#34C759", fontWeight: "600" },

  headerBlock: { gap: 16, paddingBottom: 4 },

  quickSection: { gap: 10 },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: { gap: 8, paddingRight: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 220,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
  },
  chipPressed: { backgroundColor: UI_SURFACE_PRESSED },
  chipIcon: { marginRight: -1 },
  chipAdd: { marginLeft: -1 },
  chipSpinner: { marginLeft: -1 },
  chipText: { fontSize: 15, fontWeight: "600", color: UI_TEXT_PRIMARY, flexShrink: 1 },
  kitchenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 132, 255, 0.4)",
    backgroundColor: "rgba(10, 132, 255, 0.10)",
  },
  kitchenChipText: { fontSize: 15, fontWeight: "600", color: SYSTEM_ACCENT },

  resultsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    minHeight: 64,
  },
  rowPressed: { backgroundColor: UI_SURFACE_PRESSED },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 17, fontWeight: "600", color: UI_TEXT_PRIMARY, lineHeight: 22 },
  rowMeta: { fontSize: 15, color: UI_TEXT_SECONDARY },

  centerBox: { paddingVertical: 48, paddingHorizontal: 24, gap: 8, alignItems: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: UI_TEXT_PRIMARY },
  emptyBody: { fontSize: 16, color: UI_TEXT_SECONDARY, lineHeight: 22, textAlign: "center" },

  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 69, 58, 0.12)",
    gap: 8,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#FF6961" },
  errorBody: { fontSize: 15, color: UI_TEXT_PRIMARY, lineHeight: 22 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 12 },
  retryText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },

  pressed: { opacity: 0.65 },
});
