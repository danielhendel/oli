// Compact zone label beside metric title (Body Composition overview).
import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import type { InterpretationBarModel } from "@/lib/body/bodyOverviewInterpretationBar";
import { getBodyOverviewBarDisplay } from "@/lib/body/bodyOverviewBarDisplay";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";

export type InterpretationRatingPillProps = {
  bar: InterpretationBarModel;
  /** Merged after shared shell styles (e.g. trailing alignment on overview rows). */
  shellStyle?: StyleProp<ViewStyle>;
};

export function InterpretationRatingPill({ bar, shellStyle }: InterpretationRatingPillProps) {
  const d = getBodyOverviewBarDisplay(bar);
  return (
    <View
      style={[
        moduleOverviewMetricLayoutStyles.ratingPillShell,
        shellStyle,
        { backgroundColor: d.pillBg },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={[moduleOverviewMetricLayoutStyles.ratingPillLabel, { color: d.pillFg }]} numberOfLines={1}>
        {bar.displayLabel}
      </Text>
    </View>
  );
}
