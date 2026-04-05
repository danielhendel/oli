// Compact zone label beside metric title (Body Composition overview).
import React from "react";
import { Text, View } from "react-native";

import type { InterpretationBarModel } from "@/lib/body/bodyOverviewInterpretationBar";
import { getBodyOverviewBarDisplay } from "@/lib/body/bodyOverviewBarDisplay";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";

export type InterpretationRatingPillProps = {
  bar: InterpretationBarModel;
};

export function InterpretationRatingPill({ bar }: InterpretationRatingPillProps) {
  const d = getBodyOverviewBarDisplay(bar);
  const colors = { bg: d.pillBg, fg: d.pillFg };
  return (
    <View
      style={[moduleOverviewMetricLayoutStyles.ratingPillShell, { backgroundColor: colors.bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={[moduleOverviewMetricLayoutStyles.ratingPillLabel, { color: colors.fg }]} numberOfLines={1}>
        {bar.displayLabel}
      </Text>
    </View>
  );
}
