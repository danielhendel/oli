// lib/ui/WeightRangeSelector.tsx — Segmented range for weight trend chart.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

const RANGES: { key: WeightRangeKey; label: string }[] = [
  { key: "7D", label: "7D" },
  { key: "30D", label: "30D" },
  { key: "90D", label: "90D" },
  { key: "1Y", label: "1Y" },
  { key: "All", label: "All" },
];

export type WeightRangeSelectorProps = {
  value: WeightRangeKey;
  onChange: (range: WeightRangeKey) => void;
};

export function WeightRangeSelector({ value, onChange }: WeightRangeSelectorProps) {
  return (
    <View style={styles.wrapper}>
      {RANGES.map(({ key, label }) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          style={[styles.segment, value === key && styles.segmentActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key }}
          accessibilityLabel={`Range ${label}`}
        >
          <Text style={[styles.label, value === key && styles.labelActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: "#FFFFFF", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  label: { fontSize: 13, fontWeight: "600", color: "#6E6E73" },
  labelActive: { color: "#1C1C1E", fontWeight: "700" },
});
