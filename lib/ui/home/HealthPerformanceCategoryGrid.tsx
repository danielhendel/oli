// lib/ui/home/HealthPerformanceCategoryGrid.tsx
import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";

import {
  buildHealthPerformanceCategoryCards,
  type HealthPerformanceCategoryCardModel,
} from "@/lib/home/healthPerformanceCategories";

import { HealthPerformanceCategoryCard } from "./HealthPerformanceCategoryCard";

export type HealthPerformanceCategoryGridProps = {
  cards?: HealthPerformanceCategoryCardModel[];
};

/**
 * Compact two-column category grid. Adapts to one column when text scale / width
 * would make two columns unusable.
 */
export function HealthPerformanceCategoryGrid({
  cards: cardsProp,
}: HealthPerformanceCategoryGridProps): React.ReactElement {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const cards = useMemo(
    () => cardsProp ?? buildHealthPerformanceCategoryCards(),
    [cardsProp],
  );

  const singleColumn = width < 360 || fontScale >= 1.3;
  const lastIndex = cards.length - 1;

  return (
    <View
      style={[styles.grid, singleColumn ? styles.gridColumn : styles.gridRow]}
      testID="home-health-performance-grid"
    >
      {cards.map((card, index) => {
        const fullWidth = singleColumn || (!singleColumn && index === lastIndex);
        return (
          <HealthPerformanceCategoryCard
            key={card.id}
            model={card}
            fullWidth={fullWidth}
            onPress={() => {
              router.push(card.href);
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridColumn: {
    flexDirection: "column",
  },
});
