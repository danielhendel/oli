import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useSubmitTrackedMealNutrition } from "@/lib/hooks/useSubmitTrackedMealNutrition";
import { foodItemMetaFingerprint, useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import { FoodProviderNotFoundError } from "@/lib/nutrition/FoodProviderClient";
import { isValidDayKey, type DayKey } from "@/lib/ui/calendar/types";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import {
  nutritionFoodSearchItemDtoSchema,
  type NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { useAuth } from "@/lib/auth/AuthProvider";
import * as Haptics from "expo-haptics";
import {
  MEAL_SLOT_LABEL,
  MEAL_SLOT_VALUES,
  type MealSlot,
} from "@/lib/nutrition/mealSlot";

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
  }>();
  const foodId = typeof params.foodId === "string" ? params.foodId : Array.isArray(params.foodId) ? (params.foodId[0] ?? "") : "";
  const ingestSource = useMemo(() => {
    const s = typeof params.source === "string" ? params.source : Array.isArray(params.source) ? params.source[0] : "";
    return s === "barcode" ? ("barcode" as const) : ("search" as const);
  }, [params.source]);
  const dayKey: DayKey = useMemo(() => {
    const raw = params.day;
    const d = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
    return isValidDayKey(d) ? d : getTodayDayKeyLocal();
  }, [params.day]);

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
  const [multiplierText, setMultiplierText] = useState("1");
  const [mealSlot, setMealSlot] = useState<MealSlot>("lunch");
  const submit = useSubmitTrackedMealNutrition();

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
      title: "Confirm meal",
    });
  }, [navigation]);

  const mult = useMemo(() => {
    const n = Number.parseFloat(multiplierText.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.min(n, 24);
  }, [multiplierText]);

  const performLog = useCallback(async () => {
    if (!food) return;
    const observedAtIso = new Date().toISOString();
    const r = await submit.submit({
      dayKey,
      food,
      servingMultiplier: mult,
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
  }, [food, submit, dayKey, mult, ingestSource, mealSlot, metaApi, router, returnTo]);

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

  const onToggleFavorite = useCallback(() => {
    if (!food) return;
    void metaApi.toggleFavorite(food);
  }, [food, metaApi]);

  const totals = useMemo(() => {
    if (!food) return null;
    return {
      kcal: Math.round(food.caloriesKcal * mult),
      p: Math.round(food.proteinG * mult * 10) / 10,
      c: Math.round(food.carbsG * mult * 10) / 10,
      f: Math.round(food.fatG * mult * 10) / 10,
    };
  }, [food, mult]);

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
          <View style={styles.errorBox} accessibilityRole="alert">
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
        {food && totals ? (
          <View style={[styles.body, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.favRow}>
              <Pressable
                onPress={() => void onToggleFavorite()}
                style={({ pressed }) => [styles.favBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
              >
                <Text style={styles.favBtnText}>{isFavorite ? "★ Favorited" : "☆ Favorite"}</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>Serving unit</Text>
            <Text style={styles.unitHint}>{food.servingLabel}</Text>
            <Text style={styles.label}>Servings</Text>
            <TextInput
              value={multiplierText}
              onChangeText={setMultiplierText}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel="Serving multiplier"
            />
            <Text style={styles.label}>Meal type</Text>
            <View style={styles.slotRow}>
              {MEAL_SLOT_VALUES.map((slot) => {
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
            <Text style={styles.summary}>
              {totals.kcal} kcal · P {totals.p} · C {totals.c} · F {totals.f}
            </Text>
            {submit.queuedOffline ? (
              <View style={styles.offline} accessibilityRole="text">
                <Text style={styles.offlineText}>
                  You are offline — this meal is queued and will sync automatically.
                </Text>
              </View>
            ) : null}
            {submit.errorMessage != null ? (
              <View style={styles.warn} accessibilityRole="alert">
                <Text style={styles.warnText}>{submit.errorMessage}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => void onLog()}
              disabled={submit.status === "submitting"}
              style={({ pressed }) => [
                styles.primary,
                (pressed || submit.status === "submitting") && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log this meal"
            >
              <Text style={styles.primaryText}>
                {submit.status === "submitting" ? "Logging…" : "Log meal"}
              </Text>
            </Pressable>
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
  favRow: { flexDirection: "row", justifyContent: "flex-end" },
  favBtn: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  favBtnText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  label: { fontSize: 15, fontWeight: "600", color: "#636366" },
  unitHint: { fontSize: 16, color: "#1C1C1E", marginTop: -4 },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.18)",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  slotChipSelected: {
    borderColor: SYSTEM_ACCENT,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  slotChipText: { fontSize: 15, fontWeight: "600", color: "#636366" },
  slotChipTextSelected: { color: SYSTEM_ACCENT },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.29)",
    paddingHorizontal: 12,
    fontSize: 17,
    backgroundColor: "#FFFFFF",
  },
  summary: { fontSize: 17, color: "#1C1C1E" },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  errorBox: { padding: 16, gap: 8 },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#C62828" },
  errorBody: { fontSize: 15, color: "#1C1C1E" },
  btn: { minHeight: 44, justifyContent: "center" },
  btnText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  offline: { padding: 12, borderRadius: 10, backgroundColor: "rgba(0, 122, 255, 0.08)" },
  offlineText: { fontSize: 15, color: "#1C1C1E", lineHeight: 22 },
  warn: { padding: 12, borderRadius: 10, backgroundColor: "rgba(255, 149, 0, 0.12)" },
  warnText: { fontSize: 15, color: "#1C1C1E" },
  pressed: { opacity: 0.65 },
});
