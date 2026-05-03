import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { getGymMenuOptions } from "@/lib/workouts/gymRegistry";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_OVERLAY_08 } from "@/lib/ui/theme/systemAccent";
import { UI_BORDER_SUBTLE, UI_TEXT_PRIMARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

/**
 * Gym picker for Strength settings (moved from overview overflow menu).
 */
export function StrengthGymSettingsSection() {
  const { state: prefState, setSelectedGymId } = usePreferences();

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Gym</Text>
      {getGymMenuOptions().map((opt) => {
        const selected =
          (opt.value === null && prefState.preferences.selectedGymId === null) ||
          (opt.value !== null && prefState.preferences.selectedGymId === opt.value);
        return (
          <Pressable
            key={opt.value ?? "none"}
            onPress={() => {
              setSelectedGymId(opt.value);
            }}
            style={[styles.optionRow, selected && styles.optionRowSelected]}
            accessibilityRole="button"
            accessibilityLabel={`Gym: ${opt.label}${selected ? ", selected" : ""}`}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
            {selected ? <Text style={styles.optionCheck}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_BORDER_SUBTLE,
  },
  optionRowSelected: {
    borderColor: SYSTEM_ACCENT,
    backgroundColor: SYSTEM_ACCENT_OVERLAY_08,
  },
  optionLabel: { fontSize: 16, fontWeight: "500", color: UI_TEXT_PRIMARY },
  optionCheck: { fontSize: 16, fontWeight: "700", color: SYSTEM_ACCENT },
});
