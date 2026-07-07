import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  WEIGHT_HERO_RANGE_OPTIONS,
  type WeightHeroRangeKey,
  weightHeroRangeOption,
} from "@/lib/body/weightTrendViewModel";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type WeightHeroRangeSelectorProps = {
  value: WeightHeroRangeKey;
  onChange: (range: WeightHeroRangeKey) => void;
  testID?: string;
};

/**
 * Compact range pill for the Body Weight hero card — opens an accessible modal picker.
 */
export function WeightHeroRangeSelector({
  value,
  onChange,
  testID = "body-weight-hero-range-selector",
}: WeightHeroRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = weightHeroRangeOption(value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Weight time range, ${current.feedbackLabel}. Change range.`}
        accessibilityState={{ expanded: open }}
        testID={testID}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <Text style={styles.pillLabel}>{current.compactLabel}</Text>
        <Ionicons name="chevron-down" size={14} color={UI_TEXT_SECONDARY} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close weight range menu"
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Time range
            </Text>
            <View style={styles.options}>
              {WEIGHT_HERO_RANGE_OPTIONS.map((option, index) => {
                const selected = option.key === value;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      onChange(option.key);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.feedbackLabel}${selected ? ", selected" : ""}`}
                    testID={`${testID}-option-${option.key}`}
                    style={({ pressed }) => [
                      styles.optionRow,
                      index > 0 && styles.optionRowBorder,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <Text style={[styles.optionCompact, selected && styles.optionCompactSelected]}>
                      {option.compactLabel}
                    </Text>
                    <Text style={styles.optionFeedback}>{option.feedbackLabel}</Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={SYSTEM_ACCENT} />
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pillPressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    minHeight: 32,
  },
  pillPressed: {
    opacity: 0.7,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    gap: 12,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    textAlign: "center",
    letterSpacing: -0.05,
  },
  options: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 14,
    overflow: "hidden",
    ...elevatedCardSurfaceStyle,
  },
  optionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  optionRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  optionRowPressed: {
    opacity: 0.7,
  },
  optionCompact: {
    width: 36,
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  optionCompactSelected: {
    color: SYSTEM_ACCENT,
  },
  optionFeedback: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
  checkPlaceholder: {
    width: 18,
  },
  cancelButton: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    ...elevatedCardSurfaceStyle,
  },
  cancelLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
});
