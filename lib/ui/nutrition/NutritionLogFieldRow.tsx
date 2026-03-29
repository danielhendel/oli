import React from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

export type NutritionLogFieldRowProps = {
  label: string;
  unit: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  error?: string;
  inputRef: (el: TextInput | null) => void;
  inputAccessoryViewID?: string;
  accessibilityLabel?: string;
  /** Slightly denser rows for meal builder grid. */
  compact?: boolean;
};

export function NutritionLogFieldRow({
  label,
  unit,
  value,
  onChangeText,
  onBlur,
  onFocus,
  error,
  inputRef,
  inputAccessoryViewID,
  accessibilityLabel,
  compact = false,
}: NutritionLogFieldRowProps) {
  const a11y = accessibilityLabel ?? `${label}, ${unit}`;
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, compact && styles.fieldLabelCompact]}>{label}</Text>
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        onFocus={onFocus}
        keyboardType="decimal-pad"
        inputAccessoryViewID={inputAccessoryViewID}
        returnKeyType="done"
        style={[styles.input, compact && styles.inputCompact, error != null ? styles.inputError : null]}
        placeholder="0"
        placeholderTextColor="#AEAEB2"
        accessibilityLabel={a11y}
        {...(error != null && error !== "" ? { accessibilityHint: error } : {})}
        autoCorrect={false}
        autoComplete="off"
      />
      {error != null ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { gap: 8 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  fieldLabel: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  fieldLabelCompact: { fontSize: 14 },
  fieldUnit: { fontSize: 15, fontWeight: "500", color: "#8E8E93" },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.18)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "600",
    ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums"] as const } : {}),
    color: "#1C1C1E",
  },
  inputCompact: { minHeight: 44, fontSize: 17, paddingVertical: 10 },
  inputError: { borderColor: "#FF3B30" },
  fieldError: { fontSize: 14, color: "#FF3B30", fontWeight: "500" },
});
