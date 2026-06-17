import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { NutritionMealBuilderCard } from "@/lib/ui/nutrition/NutritionMealBuilderCard";
import { NutritionMealAddItemSheet } from "@/lib/ui/nutrition/NutritionMealAddItemSheet";
import { NutritionMealManualItemSheet } from "@/lib/ui/nutrition/NutritionMealManualItemSheet";
import type { NutritionLogHubMode } from "@/lib/ui/nutrition/NutritionLogHub";
import {
  newMealDraftItemId,
  nutritionMealDraftStore,
  useNutritionMealDraft,
} from "@/lib/data/nutrition/nutritionMealDraftStore";
import {
  buildManualMealDraftItem,
  mealDraftItemsToMealItems,
  sumMealDraftMacros,
} from "@/lib/nutrition/mealDraftItem";
import { useNutritionMeals } from "@/lib/hooks/useNutritionMeals";
import { useLogComposedMeal } from "@/lib/hooks/useLogComposedMeal";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

/** Map a chooser mode to its meal-draft destination route. `manual` is handled in-page. */
const DRAFT_PATHNAME: Readonly<Record<Exclude<NutritionLogHubMode, "manual">, string>> = {
  search: "/(app)/nutrition/search",
  kitchen: "/(app)/nutrition/kitchen",
  // Recent foods/meals live behind the search screen's quick-access chips in draft mode.
  meals: "/(app)/nutrition/search",
  supplements: "/(app)/nutrition/supplements",
  scan: "/(app)/nutrition/scan",
};

export default function NutritionMealNewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[]; fresh?: string | string[] }>();
  const dayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);
  const freshParam =
    typeof params.fresh === "string"
      ? params.fresh
      : Array.isArray(params.fresh)
        ? params.fresh[0]
        : undefined;

  const draft = useNutritionMealDraft();
  const meals = useNutritionMeals();
  const addToDay = useLogComposedMeal();

  const [chooserVisible, setChooserVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  // Start a fresh draft only when explicitly entering a NEW meal (entry points pass fresh=1).
  // Returning from Search/Kitchen/etc. via dismissTo does not remount, so the draft is preserved.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (freshParam === "1") nutritionMealDraftStore.reset();
  }, [freshParam]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "New meal",
    });
  }, [navigation]);

  const totals = useMemo(() => sumMealDraftMacros(draft.items), [draft.items]);

  const editingItem = useMemo(
    () => (editingId != null ? draft.items.find((i) => i.id === editingId) ?? null : null),
    [editingId, draft.items],
  );

  const onSelectMode = useCallback(
    (mode: NutritionLogHubMode) => {
      setChooserVisible(false);
      if (mode === "manual") {
        setEditingId(null);
        setManualVisible(true);
        return;
      }
      router.push({ pathname: DRAFT_PATHNAME[mode], params: { day: dayKey, mode: "mealDraft" } });
    },
    [router, dayKey],
  );

  const onManualSubmit = useCallback(
    (args: { label: string; macros: Parameters<typeof buildManualMealDraftItem>[0]["macros"] }) => {
      if (editingId != null) {
        nutritionMealDraftStore.updateItem(editingId, {
          label: args.label.trim() || "Item",
          macros: args.macros,
        });
      } else {
        nutritionMealDraftStore.addItem(
          buildManualMealDraftItem({ id: newMealDraftItemId(), label: args.label, macros: args.macros }),
        );
      }
      setManualVisible(false);
      setEditingId(null);
    },
    [editingId],
  );

  const onEditItem = useCallback((id: string) => {
    setEditingId(id);
    setManualVisible(true);
  }, []);

  const onRemoveItem = useCallback((id: string) => {
    nutritionMealDraftStore.removeItem(id);
  }, []);

  const onAddMealToDay = useCallback(async () => {
    if (draft.items.length === 0) return;
    setAddStatus(null);
    const r = await addToDay.log({
      dayKey,
      name: draft.name.trim() || "Meal",
      totals,
      itemCount: draft.items.length,
    });
    if (r.ok) {
      nutritionMealDraftStore.reset();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* simulator */
      }
      router.replace({ pathname: "/(app)/nutrition", params: { logged: "1", day: dayKey } });
    } else {
      setAddStatus(addToDay.errorMessage ?? "Could not add meal to day");
    }
  }, [draft.items.length, draft.name, dayKey, totals, addToDay, router]);

  const onSaveMeal = useCallback(async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert("Name required", "Give your meal a name before saving.");
      return;
    }
    if (draft.items.length === 0) {
      Alert.alert("Add items", "Add at least one item before saving.");
      return;
    }
    setSaving(true);
    const saved = await meals.createMeal({ name, items: mealDraftItemsToMealItems(draft.items) });
    setSaving(false);
    if (saved) {
      nutritionMealDraftStore.reset();
      router.replace("/(app)/nutrition/meals");
    } else {
      Alert.alert("Could not save", meals.errorMessage ?? "Please try again.");
    }
  }, [draft.name, draft.items, meals, router]);

  return (
    <ModuleScreenShell title="New meal" subtitle={`Day ${dayKey}`} hideTitleChrome>
      <View style={styles.body}>
        <TextInput
          style={styles.nameInput}
          value={draft.name}
          onChangeText={nutritionMealDraftStore.setName}
          placeholder="Meal name (e.g. Eggs & Rice)"
          placeholderTextColor={UI_TEXT_MUTED}
          accessibilityLabel="Meal name"
          testID="meal-name-input"
        />

        <NutritionMealBuilderCard
          items={draft.items}
          totals={totals}
          onAddItem={() => setChooserVisible(true)}
          onEditItem={onEditItem}
          onRemoveItem={onRemoveItem}
          onAddMealToDay={() => void onAddMealToDay()}
          addingToDay={addToDay.status === "submitting"}
          statusMessage={addStatus}
          statusTone="error"
        />

        <Pressable
          onPress={() => void onSaveMeal()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save meal"
          style={({ pressed }) => [styles.saveBtn, (pressed || saving) && styles.pressed]}
          testID="meal-save-button"
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save meal"}</Text>
        </Pressable>
      </View>

      <NutritionMealAddItemSheet
        visible={chooserVisible}
        onSelectMode={onSelectMode}
        onClose={() => setChooserVisible(false)}
      />
      <NutritionMealManualItemSheet
        visible={manualVisible}
        initial={editingItem != null ? { label: editingItem.label, macros: editingItem.macros } : null}
        title={editingId != null ? "Edit item" : "Manual entry"}
        submitLabel={editingId != null ? "Save item" : "Add to meal"}
        onAdd={onManualSubmit}
        onClose={() => {
          setManualVisible(false);
          setEditingId(null);
        }}
      />
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
  nameInput: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 14,
    fontSize: 17,
    color: UI_TEXT_PRIMARY,
  },
  saveBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
