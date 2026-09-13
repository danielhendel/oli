// lib/ui/home/MyHealthPerformanceSection.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { HOME_MY_HEALTH_PERFORMANCE_TITLE } from "@/lib/navigation/consumerHome";
import type { HealthPerformanceCategoryCardModel } from "@/lib/home/healthPerformanceCategories";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

import { HealthPerformanceCategoryGrid } from "./HealthPerformanceCategoryGrid";

export type MyHealthPerformanceSectionProps = {
  cards?: HealthPerformanceCategoryCardModel[];
};

export function MyHealthPerformanceSection({
  cards,
}: MyHealthPerformanceSectionProps): React.ReactElement {
  return (
    <View style={styles.section} testID="home-my-health-performance">
      <Text
        style={styles.title}
        accessibilityRole="header"
        testID="home-my-health-performance-title"
      >
        {HOME_MY_HEALTH_PERFORMANCE_TITLE}
      </Text>
      <HealthPerformanceCategoryGrid cards={cards} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
});
