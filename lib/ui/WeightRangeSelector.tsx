// lib/ui/WeightRangeSelector.tsx — Period control matching Weight-card lb/BMI segmented chrome.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { bodySegmentedControlStyles } from "@/lib/ui/body/bodySegmentedControlChrome";

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
      style={[bodySegmentedControlStyles.track, styles.track]}
      accessibilityRole="tablist"
      testID="weight-range-selector"
    >
      {RANGES.map(({ key, label }) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              bodySegmentedControlStyles.segment,
              selected && bodySegmentedControlStyles.segmentActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Range ${label}`}
            testID={`weight-range-${key}`}
            hitSlop={{ top: 4, bottom: 4, left: 1, right: 1 }}
          >
            <Text
              style={[
                bodySegmentedControlStyles.text,
                selected && bodySegmentedControlStyles.textActive,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
  },
});
