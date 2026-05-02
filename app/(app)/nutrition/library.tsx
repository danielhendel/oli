import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useNutritionFoodSearchQuery } from "@/lib/hooks/useNutritionFoodSearchQuery";
import { useNutritionMeta, foodItemMetaFingerprint } from "@/lib/hooks/useNutritionMeta";
import { useSubmitTrackedMealNutrition } from "@/lib/hooks/useSubmitTrackedMealNutrition";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import {
  nutritionFoodSearchItemDtoSchema,
  type NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";
import type { NutritionMetaDto } from "@oli/contracts/nutritionMeta";
import {
  NutritionFoodLibrary,
  type FoodLibraryListRow,
  type NutritionFoodLibraryTab,
} from "@/lib/ui/nutrition/NutritionFoodLibrary";
import { buildFoodLibraryHistoryRows } from "@/lib/data/nutrition/buildFoodLibraryHistoryRows";
import { isValidDayKey, type DayKey } from "@/lib/ui/calendar/types";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function NutritionFoodLibraryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { getIdToken } = useAuth();
  const provider = useMemo(() => createDefaultFoodProvider(getIdToken), [getIdToken]);
  const params = useLocalSearchParams<{
    day?: string | string[];
    logged?: string | string[];
  }>();
  const dayKey: DayKey = useMemo(() => {
    const raw = params.day;
    const d = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
    return isValidDayKey(d) ? d : getTodayDayKeyLocal();
  }, [params.day]);

  const loggedParam =
    typeof params.logged === "string"
      ? params.logged
      : Array.isArray(params.logged)
        ? params.logged[0]
        : "";
  const [showLoggedBanner, setShowLoggedBanner] = useState(loggedParam === "1");

  useEffect(() => {
    setShowLoggedBanner(loggedParam === "1");
  }, [loggedParam]);

  const search = useNutritionFoodSearchQuery();
  const metaApi = useNutritionMeta();
  const submit = useSubmitTrackedMealNutrition();

  const [activeTab, setActiveTab] = useState<NutritionFoodLibraryTab>("recent");
  const [quickLoggingFoodId, setQuickLoggingFoodId] = useState<string | null>(null);
  const [addedHashes, setAddedHashes] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void metaApi.refresh();
    }, [metaApi.refresh]),
  );

  const historyRows = useMemo(
    () => buildFoodLibraryHistoryRows(metaApi.meta),
    [metaApi.meta],
  );

  const isSearching = search.query.trim().length > 0;

  const listRows: FoodLibraryListRow[] = useMemo(() => {
    if (isSearching) {
      return search.items.map((food) => ({
        key: `dto-${food.id}`,
        variant: "dto" as const,
        food,
      }));
    }
    if (activeTab === "recent") {
      return historyRows.map((h) => ({
        key: h.key,
        variant: "meta" as const,
        ref: h.ref,
      }));
    }
    return [];
  }, [isSearching, search.items, activeTab, historyRows]);

  const dismissLogged = useCallback(() => {
    setShowLoggedBanner(false);
    router.replace({
      pathname: "/(app)/nutrition/library",
      params: { day: dayKey },
    });
  }, [router, dayKey]);

  const openDetail = useCallback(
    (foodId: string) => {
      router.push({
        pathname: "/(app)/nutrition/food/[foodId]",
        params: {
          foodId,
          day: dayKey,
          source: "search",
          returnTo: "library",
        },
      });
    },
    [router, dayKey],
  );

  const quickLogFoodDto = useCallback(
    async (food: NutritionFoodSearchItemDto) => {
      const fp = foodItemMetaFingerprint(food);
      const dup =
        metaApi.meta?.recentFoods.some(
          (r) => r.foodHash === fp && r.lastUsedAt.slice(0, 10) === dayKey,
        ) ?? false;
      const run = async () => {
        setQuickLoggingFoodId(food.id);
        try {
          const observedAtIso = new Date().toISOString();
          const r = await submit.submit({
            dayKey,
            food,
            servingMultiplier: 1,
            nutritionIngestSource: "search",
            observedAtIso,
            mealSlot: "lunch",
          });
          if (!r.ok) return;
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            /* simulator */
          }
          await metaApi.upsertRecent(food);
          setAddedHashes((prev) => new Set(prev).add(fp));
          void metaApi.refresh();
        } finally {
          setQuickLoggingFoodId(null);
          submit.reset();
        }
      };
      if (dup) {
        Alert.alert("Log again?", "You already logged this food today.", [
          { text: "Cancel", style: "cancel" },
          { text: "Log anyway", onPress: () => void run() },
        ]);
        return;
      }
      await run();
    },
    [metaApi, dayKey, submit],
  );

  const quickLogMetaRef = useCallback(
    async (ref: NutritionMetaDto["recentFoods"][number]) => {
      setQuickLoggingFoodId(ref.id);
      try {
        const detail = await provider.getFoodById(ref.id);
        const parsed = nutritionFoodSearchItemDtoSchema.safeParse(detail);
        if (!parsed.success) {
          Alert.alert("Could not load food", "Try opening the food from search.");
          return;
        }
        await quickLogFoodDto(parsed.data);
      } catch (e) {
        Alert.alert("Could not load food", e instanceof Error ? e.message : "Unknown error");
      } finally {
        setQuickLoggingFoodId(null);
      }
    },
    [provider, quickLogFoodDto],
  );

  const onPressRow = useCallback(
    (row: FoodLibraryListRow) => {
      if (row.variant === "dto") {
        openDetail(row.food.id);
      } else {
        openDetail(row.ref.id);
      }
    },
    [openDetail],
  );

  const onPressRowAdd = useCallback(
    (row: FoodLibraryListRow) => {
      if (row.variant === "dto") {
        void quickLogFoodDto(row.food);
      } else {
        void quickLogMetaRef(row.ref);
      }
    },
    [quickLogFoodDto, quickLogMetaRef],
  );

  const onOpenFilter = useCallback(() => {
    Alert.alert("Filter", "Sorting and filters are coming soon.");
  }, []);

  const onOpenCreateMeal = useCallback(() => {
    router.push({
      pathname: "/(app)/nutrition/log",
      params: { day: dayKey, mode: "meal" },
    });
  }, [router, dayKey]);

  return (
    <NutritionFoodLibrary
      dayKey={dayKey}
      onBackPress={() => router.back()}
      showLoggedBanner={showLoggedBanner}
      onDismissLoggedBanner={dismissLogged}
      query={search.query}
      onQueryChange={search.setQuery}
      searchStatus={search.status}
      searchErrorMessage={search.errorMessage}
      onRetrySearch={search.refresh}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      listRows={listRows}
      metaLoading={metaApi.loading}
      quickLoggingFoodId={quickLoggingFoodId}
      addedFoodHashes={addedHashes}
      onPressRow={onPressRow}
      onPressRowAdd={onPressRowAdd}
      onScanBarcode={() =>
        router.push({
          pathname: "/(app)/nutrition/scan",
          params: { day: dayKey, returnTo: "library" },
        })
      }
      onQuickAddMacros={() =>
        router.push({
          pathname: "/(app)/nutrition/log",
          params: { day: dayKey, mode: "quick" },
        })
      }
      onOpenCreateMenu={onOpenCreateMeal}
      onOpenFilter={onOpenFilter}
    />
  );
}
