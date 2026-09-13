// lib/ui/onboarding/OnboardingStepIndicator.tsx
import React from "react";
import { StyleSheet, View } from "react-native";

import { ONBOARDING_VISUAL } from "./onboardingVisualTokens";

export type OnboardingStepIndicatorProps = {
  stepIndex: number;
  stepCount?: number;
};

export function OnboardingStepIndicator({
  stepIndex,
  stepCount = 3,
}: OnboardingStepIndicatorProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${stepIndex} of ${stepCount}`}
      accessibilityValue={{ min: 1, max: stepCount, now: stepIndex }}
    >
      {Array.from({ length: stepCount }).map((_, i) => {
        const active = i + 1 <= stepIndex;
        const current = i + 1 === stepIndex;
        return (
          <View
            key={i}
            style={[
              styles.segment,
              active ? styles.segmentActive : null,
              current ? styles.segmentCurrent : null,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    minHeight: 44,
    flex: 1,
  },
  segment: {
    flex: 1,
    maxWidth: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: ONBOARDING_VISUAL.progressTrack,
  },
  segmentActive: {
    backgroundColor: ONBOARDING_VISUAL.progressFill,
  },
  segmentCurrent: {
    height: 5,
  },
});
