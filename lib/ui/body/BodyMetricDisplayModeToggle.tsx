/**
 * Compact Body metric detail display-mode toggle (lb|BMI, %|lb, etc.).
 * Same chrome as Body Composition landing cards.
 */

import React from "react";
import { Pressable, Text, View } from "react-native";

import { bodySegmentedControlStyles } from "@/lib/ui/body/bodySegmentedControlChrome";

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
      style={bodySegmentedControlStyles.track}
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
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
