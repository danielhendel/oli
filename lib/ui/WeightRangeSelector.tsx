// lib/ui/WeightRangeSelector.tsx — Period control matching Weight-card lb/BMI segmented chrome.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { bodyWeightRangeSelectorStyles } from "@/lib/ui/body/bodySegmentedControlChrome";

const RANGES: { key: WeightRangeKey; label: string; accessibilityLabel: string }[] = [
  { key: "7D", label: "7D", accessibilityLabel: "7 days" },
  { key: "30D", label: "30D", accessibilityLabel: "30 days" },
  { key: "90D", label: "90D", accessibilityLabel: "90 days" },
  { key: "6M", label: "6M", accessibilityLabel: "6 months" },
  { key: "1Y", label: "1Y", accessibilityLabel: "1 year" },
  { key: "3Y", label: "3Y", accessibilityLabel: "3 years" },
  { key: "5Y", label: "5Y", accessibilityLabel: "5 years" },
  { key: "All", label: "All", accessibilityLabel: "All history" },
];

export type WeightRangeSelectorProps = {
  value: WeightRangeKey;
  onChange: (range: WeightRangeKey) => void;
};

export function WeightRangeSelector({ value, onChange }: WeightRangeSelectorProps) {
  return (
    <View
      style={[bodyWeightRangeSelectorStyles.track, styles.track]}
      accessibilityRole="tablist"
      testID="weight-range-selector"
    >
      {RANGES.map(({ key, label, accessibilityLabel }) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              bodyWeightRangeSelectorStyles.segment,
              selected && bodyWeightRangeSelectorStyles.segmentActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={accessibilityLabel}
            testID={`weight-range-${key}`}
            hitSlop={{ top: 4, bottom: 4, left: 1, right: 1 }}
          >
            <Text
              style={[
                bodyWeightRangeSelectorStyles.text,
                selected && bodyWeightRangeSelectorStyles.textActive,
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
