// lib/ui/health-assessment/HealthAssessmentProgressHeader.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type HealthAssessmentProgressHeaderProps = {
  title: string;
  subtitle: string;
  categoryIndex: number;
  totalCategories: number;
  overallProgress: number;
};

export function HealthAssessmentProgressHeader({
  title,
  subtitle,
  categoryIndex,
  totalCategories,
  overallProgress,
}: HealthAssessmentProgressHeaderProps): React.ReactElement {
  const stepLabel =
    categoryIndex < totalCategories
      ? `Step ${categoryIndex + 1} of ${totalCategories}`
      : "Summary";

  return (
    <View style={styles.wrap} testID="health-assessment-progress-header">
      <Text style={styles.step}>{stepLabel}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <LinearProgressBar
        progress={overallProgress}
        trackColor={SYSTEM_ACCENT_FILL_14}
        fillColor={SYSTEM_ACCENT}
        height={6}
        testID="health-assessment-overall-progress"
      />
      <Text style={styles.percent}>{Math.round(overallProgress * 100)}% overall</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 16,
  },
  step: {
    fontSize: 13,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  percent: {
    fontSize: 12,
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 2,
  },
});
