// lib/ui/health-baseline/HealthBaselineSummaryCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { HealthBaselineSummary } from "@/lib/data/health-baseline/types";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type HealthBaselineSummaryCardProps = {
  summary: HealthBaselineSummary;
};

function BulletSection({
  title,
  items,
  testID,
}: {
  title: string;
  items: readonly string[];
  testID?: string;
}): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <View testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.bullet}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export function HealthBaselineSummaryCard({
  summary,
}: HealthBaselineSummaryCardProps): React.ReactElement {
  return (
    <ProgramSectionCard
      title="Baseline Summary"
      subtitle="Informational snapshot — not medical advice or recommendations."
      testID="health-baseline-summary-card"
    >
      <BulletSection title="Strengths" items={summary.strengths} testID="baseline-strengths" />
      <BulletSection
        title="Areas missing data"
        items={summary.areasMissingData}
        testID="baseline-missing"
      />
      <BulletSection
        title="Most reliable metrics"
        items={summary.mostReliableMetrics}
        testID="baseline-reliable"
      />
      <BulletSection
        title="Most incomplete metrics"
        items={summary.mostIncompleteMetrics}
        testID="baseline-incomplete"
      />
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    marginTop: 8,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginBottom: 2,
  },
});
