import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionLogSubmitStatus } from "@/lib/hooks/useNutritionLogSubmit";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

export type NutritionLoggingSubmitBarProps = {
  canSubmit: boolean;
  status: NutritionLogSubmitStatus;
  onSave: () => void;
};

export function NutritionLoggingSubmitBar({ canSubmit, status, onSave }: NutritionLoggingSubmitBarProps) {
  const submitting = status === "submitting";
  const disabled = !canSubmit || submitting;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}
      onPress={onSave}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={canSubmit ? "Save day nutrition totals" : "Save disabled until totals are valid"}
      accessibilityState={{ disabled }}
    >
      {submitting ? (
        <View style={styles.row}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.btnText}>Saving…</Text>
        </View>
      ) : (
        <Text style={styles.btnText}>Save day</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: NUTRITION_ACCENT,
    borderRadius: 14,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.92 },
  btnDisabled: { opacity: 0.38 },
  btnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
