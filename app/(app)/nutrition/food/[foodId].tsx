import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useSubmitTrackedMealNutrition } from "@/lib/hooks/useSubmitTrackedMealNutrition";
import { foodItemMetaFingerprint, useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { useNutritionPantry } from "@/lib/hooks/useNutritionPantry";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import { FoodProviderNotFoundError } from "@/lib/nutrition/FoodProviderClient";
import { type DayKey } from "@/lib/ui/calendar/types";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import {
  nutritionFoodSearchItemDtoSchema,
  type NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";
import { NutritionServingPicker } from "@/lib/ui/nutrition/NutritionServingPicker";
import { NutritionSourceBadges } from "@/lib/ui/nutrition/NutritionSourceBadges";
import { buildServingOptions, defaultServingOption, resolveServing } from "@/lib/nutrition/servingSelection";
import { buildMealDraftItemFromFood, describeServingSelection } from "@/lib/nutrition/mealDraftItem";
import {
  newMealDraftItemId,
  nutritionMealDraftStore,
} from "@/lib/data/nutrition/nutritionMealDraftStore";
import { foodToAddPantryRequest } from "@/lib/nutrition/pantryFood";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { useAuth } from "@/lib/auth/AuthProvider";
import * as Haptics from "expo-haptics";
import {
  MEAL_SLOT_LABEL,
  MEAL_SLOT_LEGACY_VALUES,
  type MealSlot,
} from "@/lib/nutrition/mealSlot";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
export default function NutritionFoodConfirmScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getIdToken } = useAuth();
  const provider = useMemo(() => createDefaultFoodProvider(getIdToken), [getIdToken]);
  const metaApi = useNutritionMeta();

  const params = useLocalSearchParams<{
    foodId?: string | string[];
    day?: string | string[];
    source?: string | string[];
    returnTo?: string | string[];
    mode?: string | string[];
  }>();
  const isMealDraft = useMemo(() => {
    const m = typeof params.mode === "string" ? params.mode : Array.isArray(params.mode) ? params.mode[0] : "";
    return m === "mealDraft";
  }, [params.mode]);
  const foodId = typeof params.foodId === "string" ? params.foodId : Array.isArray(params.foodId) ? (params.foodId[0] ?? "") : "";
  const ingestSource = useMemo(() => {
    const s = typeof params.source === "string" ? params.source : Array.isArray(params.source) ? params.source[0] : "";
    return s === "barcode" ? ("barcode" as const) : ("search" as const);
  }, [params.source]);
  const dayKey: DayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  const returnTo = useMemo(() => {
    const r =
      typeof params.returnTo === "string"
        ? params.returnTo
        : Array.isArray(params.returnTo)
          ? params.returnTo[0]
          : "";
    return r === "library" ? ("library" as const) : ("overview" as const);
  }, [params.returnTo]);

  const [food, setFood] = useState<NutritionFoodSearchItemDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingFood, setLoadingFood] = useState(true);
  const [servingOptionKey, setServingOptionKey] = useState("");
  const [quantityText, setQuantityText] = useState("1");
  const [mealSlot, setMealSlot] = useState<MealSlot>("lunch");
  const [savedToKitchen, setSavedToKitchen] = useState(false);
  const submit = useSubmitTrackedMealNutrition();
  const pantry = useNutritionPantry();

  const fingerprint = food ? foodItemMetaFingerprint(food) : "";
  const isFavorite =
    food != null ? (metaApi.meta?.favoriteFoods.some((x) => x.foodHash === fingerprint) ?? false) : false;

  const load = useCallback(async () => {
    setLoadingFood(true);
    setLoadError(null);
    try {
      const detail = await provider.getFoodById(foodId);
      const parsed = nutritionFoodSearchItemDtoSchema.safeParse(detail);
      if (!parsed.success) {
        setLoadError("Unexpected food response");
        setFood(null);
      } else {
        setFood(parsed.data);
        setServingOptionKey(defaultServingOption(parsed.data).key);
        setQuantityText("1");
        setSavedToKitchen(false);
      }
    } catch (e) {
      if (e instanceof FoodProviderNotFoundError) {
        setLoadError("Food not found.");
      } else {
        setLoadError(e instanceof Error ? e.message : "Could not load food");
      }
      setFood(null);
    }
    setLoadingFood(false);
  }, [foodId, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: isMealDraft ? "Add to meal" : "Confirm meal",
    });
  }, [navigation, isMealDraft]);

  const resolved = useMemo(() => {
    if (!food) return null;
    const options = buildServingOptions(food);
    const option = options.find((o) => o.key === servingOptionKey) ?? options[0]!;
    const n = Number.parseFloat(quantityText.replace(",", "."));
    const qty = Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 0;
    return resolveServing(food, option, qty);
  }, [food, servingOptionKey, quantityText]);

  const servingMultiplier = resolved?.servingMultiplier ?? 1;

  const performLog = useCallback(async () => {
    if (!food) return;
    const observedAtIso = new Date().toISOString();
    const r = await submit.submit({
      dayKey,
      food,
      servingMultiplier,
      nutritionIngestSource: ingestSource,
      observedAtIso,
      mealSlot,
    });
    if (!r.ok) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* simulator */
    }
    await metaApi.upsertRecent(food);
    router.replace(
      returnTo === "library"
        ? {
            pathname: "/(app)/nutrition/library",
            params: { day: dayKey, logged: "1" },
          }
        : {
            pathname: "/(app)/nutrition",
            params: { logged: "1", day: dayKey },
          },
    );
  }, [food, submit, dayKey, servingMultiplier, ingestSource, mealSlot, metaApi, router, returnTo]);

  const onLog = useCallback(() => {
    if (!food) return;
    const fp = foodItemMetaFingerprint(food);
    const dup =
      metaApi.meta?.recentFoods.some(
        (r) => r.foodHash === fp && r.lastUsedAt.slice(0, 10) === dayKey,
      ) ?? false;
    if (dup) {
      Alert.alert("Log again?", "You already logged this food today.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log anyway", onPress: () => void performLog() },
      ]);
      return;
    }
    void performLog();
  }, [food, metaApi.meta?.recentFoods, dayKey, performLog]);

  const onAddToMeal = useCallback(() => {
    if (!food || !resolved) return;
    const options = buildServingOptions(food);
    const option = options.find((o) => o.key === servingOptionKey) ?? options[0]!;
    const n = Number.parseFloat(quantityText.replace(",", "."));
    const qty = Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 0;
    const servingLabel = describeServingSelection(food, option, qty);
    nutritionMealDraftStore.addItem(
      buildMealDraftItemFromFood({
        id: newMealDraftItemId(),
        food,
        nutrition: resolved.nutrition,
        servingLabel,
      }),
    );
    void (async () => {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* simulator */
      }
    })();
    router.dismissTo({ pathname: "/(app)/nutrition/meal/new", params: { day: dayKey } });
  }, [food, resolved, servingOptionKey, quantityText, router, dayKey]);

  const onToggleFavorite = useCallback(() => {
    if (!food) return;
    void metaApi.toggleFavorite(food);
  }, [food, metaApi]);

  const onSaveToKitchen = useCallback(async () => {
    if (!food) return;
    const ok = await pantry.addItem(foodToAddPantryRequest(food, servingMultiplier));
    if (ok) {
      setSavedToKitchen(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* simulator */
      }
    }
  }, [food, pantry, servingMultiplier]);

  return (
    <ModuleScreenShell title="Confirm meal" subtitle={food?.name ?? ""} hideTitleChrome>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {loadingFood ? (
          <View style={styles.center} accessibilityLabel="Loading food details">
            <ActivityIndicator color={SYSTEM_ACCENT} />
          </View>
        ) : null}
        {loadError != null ? (
          <View
            style={styles.errorBox}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="food-detail-load-error"
          >
            <Text style={styles.errorTitle}>Could not load food</Text>
            <Text style={styles.errorBody}>{loadError}</Text>
            <Pressable
              onPress={() => void load()}
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading food"
            >
              <Text style={styles.btnText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {food && resolved ? (
          <View style={[styles.body, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.foodHeader}>
              <Text style={styles.foodTitle} testID="food-detail-title">
                {food.name}
              </Text>
              {food.brand ? <Text style={styles.foodBrand}>{food.brand}</Text> : null}
            </View>
            <View style={styles.favRow}>
              <NutritionSourceBadges
                source={food.source}
                productType={food.productType}
                attributionRequired={food.attributionRequired}
              />
              <Pressable
                onPress={() => void onToggleFavorite()}
                style={({ pressed }) => [styles.favBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
              >
                <Text style={styles.favBtnText}>{isFavorite ? "★ Favorited" : "☆ Favorite"}</Text>
              </Pressable>
            </View>
            <NutritionServingPicker
              food={food}
              selectedOptionKey={servingOptionKey}
              quantityText={quantityText}
              onSelectOption={setServingOptionKey}
              onChangeQuantity={setQuantityText}
            />
            {!isMealDraft ? (
              <>
                <Text style={styles.label}>Meal type</Text>
                <View style={styles.slotRow}>
                  {MEAL_SLOT_LEGACY_VALUES.map((slot) => {
                    const selected = mealSlot === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setMealSlot(slot)}
                        style={({ pressed }) => [
                          styles.slotChip,
                          selected && styles.slotChipSelected,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Meal type ${MEAL_SLOT_LABEL[slot]}`}
                      >
                        <Text style={[styles.slotChipText, selected && styles.slotChipTextSelected]}>
                          {MEAL_SLOT_LABEL[slot]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            {submit.queuedOffline ? (
              <View style={styles.offline} accessibilityRole="text" accessibilityLiveRegion="polite">
                <Text style={styles.offlineText}>
                  You are offline — this meal is queued and will sync automatically.
                </Text>
              </View>
            ) : null}
            {submit.errorMessage != null ? (
              <View
                style={styles.warn}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                testID="food-detail-submit-error"
              >
                <Text style={styles.warnText}>{submit.errorMessage}</Text>
              </View>
            ) : null}
            {isMealDraft ? (
              <Pressable
                onPress={onAddToMeal}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Add this food to the meal"
                testID="food-add-to-meal"
              >
                <Text style={styles.primaryText}>Add to Meal</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void onLog()}
                disabled={submit.status === "submitting"}
                style={({ pressed }) => [
                  styles.primary,
                  (pressed || submit.status === "submitting") && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Log this meal"
                testID="food-log-meal"
              >
                <Text style={styles.primaryText}>
                  {submit.status === "submitting" ? "Logging…" : "Log meal"}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => void onSaveToKitchen()}
              disabled={savedToKitchen}
              style={({ pressed }) => [styles.secondary, (pressed || savedToKitchen) && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={savedToKitchen ? "Saved to kitchen" : "Save to kitchen"}
              accessibilityState={{ disabled: savedToKitchen }}
              testID="food-save-to-kitchen"
            >
              <Text style={styles.secondaryText}>
                {savedToKitchen ? "✓ Saved to Kitchen" : "Save to Kitchen"}
              </Text>
            </Pressable>
            {pantry.errorMessage != null && !savedToKitchen ? (
              <View style={styles.warn} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text style={styles.warnText}>{pantry.errorMessage}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  foodHeader: { gap: 4 },
  foodTitle: { fontSize: 28, fontWeight: "700", color: UI_TEXT_PRIMARY, lineHeight: 34 },
  foodBrand: { fontSize: 17, color: UI_TEXT_SECONDARY, lineHeight: 22 },
  favRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  favBtn: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  favBtnText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  label: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    justifyContent: "center",
  },
  slotChipSelected: {
    borderColor: SYSTEM_ACCENT,
    backgroundColor: "rgba(10, 132, 255, 0.14)",
  },
  slotChipText: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY },
  slotChipTextSelected: { color: SYSTEM_ACCENT },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  secondary: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: SYSTEM_ACCENT, fontSize: 17, fontWeight: "600" },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 69, 58, 0.14)",
    gap: 8,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#FF6961" },
  errorBody: { fontSize: 15, color: UI_TEXT_PRIMARY, lineHeight: 22 },
  btn: { minHeight: 44, justifyContent: "center" },
  btnText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  offline: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(10, 132, 255, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 132, 255, 0.28)",
  },
  offlineText: { fontSize: 15, color: UI_TEXT_PRIMARY, lineHeight: 22 },
  warn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255, 159, 10, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 159, 10, 0.32)",
  },
  warnText: { fontSize: 15, color: UI_TEXT_PRIMARY, lineHeight: 22 },
  pressed: { opacity: 0.65 },
});
