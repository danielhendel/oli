import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { sanitizeNutritionAmountInput } from "@/lib/nutrition/nutritionLogInput";
import type { NutritionMealDraftMacros } from "@/lib/data/nutrition/nutritionMealDraftStore";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_OVERLAY,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  visible: boolean;
  onAdd: (args: { label: string; macros: NutritionMealDraftMacros }) => void;
  onClose: () => void;
  /** Prefill values (edit mode). */
  initial?: { label: string; macros: NutritionMealDraftMacros } | null;
  title?: string;
  submitLabel?: string;
};

function amountToText(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return String(Math.round(n * 100) / 100);
}

function parseAmount(text: string): number | null {
  const t = text.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** In-page manual food entry for the meal builder (label + calories + macros + fiber). */
export function NutritionMealManualItemSheet({
  visible,
  onAdd,
  onClose,
  initial = null,
  title = "Manual entry",
  submitLabel = "Add to meal",
}: Props) {
  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLabel(initial?.label ?? "");
    setCalories(amountToText(initial?.macros.caloriesKcal ?? 0));
    setProteinG(amountToText(initial?.macros.proteinG ?? 0));
    setCarbsG(amountToText(initial?.macros.carbsG ?? 0));
    setFatG(amountToText(initial?.macros.fatG ?? 0));
    setFiberG(amountToText(initial?.macros.fiberG ?? 0));
    setError(null);
  }, [visible, initial]);

  const handleAdd = () => {
    const parsed = {
      caloriesKcal: parseAmount(calories),
      proteinG: parseAmount(proteinG),
      carbsG: parseAmount(carbsG),
      fatG: parseAmount(fatG),
      fiberG: parseAmount(fiberG),
    };
    if (Object.values(parsed).some((v) => v === null)) {
      setError("Use valid numbers for each value.");
      return;
    }
    const macros: NutritionMealDraftMacros = {
      caloriesKcal: parsed.caloriesKcal ?? 0,
      proteinG: parsed.proteinG ?? 0,
      carbsG: parsed.carbsG ?? 0,
      fatG: parsed.fatG ?? 0,
      fiberG: parsed.fiberG ?? 0,
    };
    if (
      macros.caloriesKcal === 0 &&
      macros.proteinG === 0 &&
      macros.carbsG === 0 &&
      macros.fatG === 0 &&
      macros.fiberG === 0
    ) {
      setError("Enter at least calories or a macro.");
      return;
    }
    setError(null);
    onAdd({ label, macros });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss manual entry"
          onPress={onClose}
        />
        <View style={styles.sheet} testID="meal-manual-item-sheet">
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Homemade smoothie"
              placeholderTextColor={UI_TEXT_MUTED}
              style={styles.input}
              accessibilityLabel="Item name"
              testID="manual-item-label"
            />

            <View style={styles.grid}>
              <Field label="Calories" value={calories} onChange={(t) => setCalories(sanitizeNutritionAmountInput(t))} inputTestID="manual-item-calories" />
              <Field label="Protein (g)" value={proteinG} onChange={(t) => setProteinG(sanitizeNutritionAmountInput(t))} inputTestID="manual-item-protein" />
              <Field label="Carbs (g)" value={carbsG} onChange={(t) => setCarbsG(sanitizeNutritionAmountInput(t))} inputTestID="manual-item-carbs" />
              <Field label="Fat (g)" value={fatG} onChange={(t) => setFatG(sanitizeNutritionAmountInput(t))} inputTestID="manual-item-fat" />
              <Field label="Fiber (g)" value={fiberG} onChange={(t) => setFiberG(sanitizeNutritionAmountInput(t))} inputTestID="manual-item-fiber" />
            </View>

            {error != null ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite" testID="manual-item-error">
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Add manual item to meal"
              testID="manual-item-add"
            >
              <Text style={styles.primaryText}>{submitLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cancel manual entry"
              testID="manual-item-cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: { label: string; value: string; onChange: (t: string) => void; inputTestID: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={UI_TEXT_MUTED}
        style={styles.cellInput}
        accessibilityLabel={props.label}
        testID={props.inputTestID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: UI_OVERLAY, justifyContent: "flex-end" },
  backdropPress: { flex: 1 },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 10,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "700", color: UI_TEXT_PRIMARY, letterSpacing: -0.3 },
  label: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY, marginTop: 8, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    paddingHorizontal: 14,
    fontSize: 17,
    color: UI_TEXT_PRIMARY,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  cell: { width: "47%", flexGrow: 1, gap: 6 },
  cellLabel: { fontSize: 13, fontWeight: "600", color: UI_TEXT_SECONDARY },
  cellInput: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    paddingHorizontal: 12,
    fontSize: 17,
    color: UI_TEXT_PRIMARY,
  },
  errorText: { fontSize: 14, color: "#FF6961", lineHeight: 20, marginTop: 12 },
  primary: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  cancelText: { color: UI_TEXT_SECONDARY, fontSize: 16, fontWeight: "500" },
  pressed: { opacity: 0.65 },
});
