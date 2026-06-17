import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  NutritionMealDraftItem,
  NutritionMealDraftMacros,
} from "@/lib/data/nutrition/nutritionMealDraftStore";
import { formatMealDraftSubtotal } from "@/lib/nutrition/mealDraftItem";
import { NutritionSourceBadges } from "@/lib/ui/nutrition/NutritionSourceBadges";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type NutritionMealBuilderCardProps = {
  items: readonly NutritionMealDraftItem[];
  totals: NutritionMealDraftMacros;
  onAddItem: () => void;
  onEditItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddMealToDay: () => void;
  addingToDay?: boolean;
  statusMessage?: string | null;
  statusTone?: "success" | "error";
};

export function NutritionMealBuilderCard({
  items,
  totals,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onAddMealToDay,
  addingToDay = false,
  statusMessage = null,
  statusTone = "success",
}: NutritionMealBuilderCardProps) {
  const empty = items.length === 0;

  return (
    <View style={styles.stack}>
      <Text style={styles.lede}>
        Add foods from Search, Kitchen, Recents, Supplements, or scan a barcode. Nothing is saved
        until you add the meal to your day or save it.
      </Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          Meal items
        </Text>

        {empty ? (
          <View style={styles.emptyBox} testID="meal-items-empty">
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyBody}>Tap “Add item” to choose a food for this meal.</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.rowCard} testID={`meal-item-${item.id}`}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.servingLabel} · {Math.round(item.macros.caloriesKcal)} kcal · P{" "}
                  {Math.round(item.macros.proteinG)} · C {Math.round(item.macros.carbsG)} · F{" "}
                  {Math.round(item.macros.fatG)}
                </Text>
                <NutritionSourceBadges
                  source={item.source}
                  productType={item.productType}
                  attributionRequired={item.attributionRequired}
                  compact
                />
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => onEditItem(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.label}`}
                  hitSlop={6}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  testID={`meal-item-edit-${item.id}`}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => onRemoveItem(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.label}`}
                  hitSlop={6}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  testID={`meal-item-remove-${item.id}`}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={onAddItem}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add item to meal"
          testID="meal-add-item"
        >
          <Text style={styles.secondaryBtnText}>+ Add item</Text>
        </Pressable>

        <View style={styles.subtotalBox}>
          <Text style={styles.subtotalLabel}>This meal</Text>
          <Text style={styles.subtotalValue} testID="meal-subtotal">
            {formatMealDraftSubtotal(totals)}
            {totals.fiberG > 0 ? ` · Fiber ${Math.round(totals.fiberG)}` : ""}
          </Text>
        </View>

        {statusMessage != null ? (
          <Text
            style={[styles.status, statusTone === "error" ? styles.statusError : styles.statusOk]}
            accessibilityRole={statusTone === "error" ? "alert" : "text"}
            accessibilityLiveRegion="polite"
            testID="meal-add-to-day-status"
          >
            {statusMessage}
          </Text>
        ) : null}

        <Pressable
          onPress={onAddMealToDay}
          disabled={empty || addingToDay}
          style={({ pressed }) => [
            styles.primary,
            (empty || addingToDay) && styles.primaryDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add meal to day"
          accessibilityState={{ disabled: empty || addingToDay }}
          testID="meal-add-to-day"
        >
          {addingToDay ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Add meal to day</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  lede: { fontSize: 15, lineHeight: 22, color: UI_TEXT_SECONDARY, letterSpacing: -0.2 },
  group: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    ...elevatedCardSurfaceStyle,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptyBox: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY },
  emptyBody: { fontSize: 14, color: UI_TEXT_SECONDARY, textAlign: "center", lineHeight: 20 },
  rowCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY, lineHeight: 21 },
  rowMeta: { fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 19 },
  rowActions: { alignItems: "flex-end", gap: 6 },
  actionBtn: { minHeight: 36, justifyContent: "center", paddingHorizontal: 4 },
  editText: { fontSize: 15, fontWeight: "600", color: NUTRITION_ACCENT },
  removeText: { fontSize: 15, fontWeight: "600", color: "#FF453A" },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_BORDER_HAIRLINE,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600", color: NUTRITION_ACCENT },
  subtotalBox: {
    backgroundColor: "rgba(52, 199, 89, 0.12)",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  subtotalLabel: { fontSize: 13, fontWeight: "700", color: UI_TEXT_SECONDARY },
  subtotalValue: { fontSize: 16, fontWeight: "700", color: UI_TEXT_PRIMARY },
  status: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  statusOk: { color: "#34C759" },
  statusError: { color: "#FF6961" },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: NUTRITION_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  pressed: { opacity: 0.85 },
});
