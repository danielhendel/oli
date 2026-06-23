// lib/ui/labs/LabsCategoryCard.tsx
// Non-collapsible category card matching Profile Health & Fitness elevated surface.
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { LabMetricRow, type LabMetricRowVm } from "@/lib/ui/labs/LabMetricRow";

export type LabsCategoryCardVm = {
  categoryKey: string;
  title: string;
  rows: LabMetricRowVm[];
};

export type LabsCategoryCardProps = {
  card: LabsCategoryCardVm;
  onPressMetric: (metricKey: string) => void;
};

export function LabsCategoryCard({ card, onPressMetric }: LabsCategoryCardProps) {
  return (
    <View style={styles.card} testID={`labs-category-card-${card.categoryKey}`} accessibilityRole="summary">
      <Text style={[strengthMetricCardTitleTextStyle, styles.title]} accessibilityRole="header">
        {card.title}
      </Text>
      <View style={styles.rows}>
        {card.rows.map((row) => (
          <LabMetricRow key={row.metricKey} row={row} onPress={onPressMetric} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 15,
    gap: 4,
  },
  title: {
    marginBottom: 4,
  },
  rows: {
    gap: 2,
  },
});
