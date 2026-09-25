/**
 * Compact Body metric detail display-mode toggle (lb|BMI, %|lb, etc.).
 * Same chrome as Body Composition landing cards.
 *
 * Bounded track width keeps both segments equal and fully visible beside the
 * large hero value (avoids ScrollView intrinsic-width overflow).
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bodySegmentedControlStyles } from "@/lib/ui/body/bodySegmentedControlChrome";

/**
 * Two comfortable segments (minWidth 58) + track padding (2×2).
 * Wide enough for `BMI` / `kg` on one line; shared by Weight / Body Fat / Lean.
 */
export const BODY_METRIC_DISPLAY_MODE_TOGGLE_WIDTH = 124;

export type BodyMetricDisplayModeOption<T extends string> = {
  readonly id: T;
  readonly label: string;
  readonly accessibilityLabel: string;
};

export type BodyMetricDisplayModeToggleProps<T extends string> = {
  readonly options: readonly BodyMetricDisplayModeOption<T>[];
  readonly selected: T;
  readonly onChange: (next: T) => void;
  readonly testID?: string;
};

export function BodyMetricDisplayModeToggle<T extends string>(
  props: BodyMetricDisplayModeToggleProps<T>,
) {
  const testID = props.testID ?? "body-metric-display-mode-toggle";
  return (
    <View
      style={[bodySegmentedControlStyles.track, styles.trackBounded]}
      testID={testID}
      accessibilityRole="tablist"
    >
      {props.options.map((option) => {
        const selected = props.selected === option.id;
        return (
          <Pressable
            key={option.id}
            style={[
              bodySegmentedControlStyles.segment,
              bodySegmentedControlStyles.segmentComfortable,
              styles.segmentEqual,
              selected && bodySegmentedControlStyles.segmentActive,
            ]}
            onPress={() => {
              if (!selected) props.onChange(option.id);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel}
            accessibilityHint={
              selected ? "Selected." : `Double tap to show ${option.label} view.`
            }
            testID={`${testID}-${option.id}`}
          >
            <Text
              style={[
                bodySegmentedControlStyles.text,
                selected && bodySegmentedControlStyles.textActive,
              ]}
              numberOfLines={1}
              allowFontScaling
              maxFontSizeMultiplier={1.35}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trackBounded: {
    width: BODY_METRIC_DISPLAY_MODE_TOGGLE_WIDTH,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  /** Equal share inside the bounded track (overrides card flexShrink:0 growth). */
  segmentEqual: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 8,
  },
});
