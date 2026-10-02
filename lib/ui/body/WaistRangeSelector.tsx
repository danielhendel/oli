import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WeightRangeKey } from "@/lib/data/body/bodyHistoryRange";
import { bodyWeightRangeSelectorStyles } from "@/lib/ui/body/bodySegmentedControlChrome";

/** Waist detail chart ranges — 30D/90D mapped to 1M/3M labels. */
export const WAIST_DETAIL_RANGES: {
  key: WeightRangeKey;
  label: string;
  accessibilityLabel: string;
}[] = [
  { key: "30D", label: "1M", accessibilityLabel: "1 month" },
  { key: "90D", label: "3M", accessibilityLabel: "3 months" },
  { key: "6M", label: "6M", accessibilityLabel: "6 months" },
  { key: "1Y", label: "1Y", accessibilityLabel: "1 year" },
  { key: "All", label: "All", accessibilityLabel: "All history" },
];

export type WaistRangeSelectorProps = {
  value: WeightRangeKey;
  onChange: (range: WeightRangeKey) => void;
};

export function WaistRangeSelector({ value, onChange }: WaistRangeSelectorProps) {
  return (
    <View
      style={[bodyWeightRangeSelectorStyles.track, styles.track]}
      accessibilityRole="tablist"
      testID="waist-range-selector"
    >
      {WAIST_DETAIL_RANGES.map(({ key, label, accessibilityLabel }) => {
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
            testID={`waist-range-${key}`}
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
