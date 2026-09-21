import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";

// lib/ui/WeightRangeSelector.tsx — Light premium period control above the hero chart.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

const RANGES: { key: WeightRangeKey; label: string }[] = [
  { key: "7D", label: "7D" },
  { key: "30D", label: "30D" },
  { key: "90D", label: "90D" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
  { key: "3Y", label: "3Y" },
  { key: "5Y", label: "5Y" },
  { key: "All", label: "All" },
];

export type WeightRangeSelectorProps = {
  value: WeightRangeKey;
  onChange: (range: WeightRangeKey) => void;
};

export function WeightRangeSelector({ value, onChange }: WeightRangeSelectorProps) {
  return (
    <View
      style={styles.wrapper}
      accessibilityRole="tablist"
      testID="weight-range-selector"
    >
      {RANGES.map(({ key, label }) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.segment, selected && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Range ${label}`}
            testID={`weight-range-${key}`}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 2,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: SYSTEM_ACCENT_OVERLAY_10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
  labelActive: {
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
  },
});
