// lib/ui/home/HealthPerformanceCategoryGrid.tsx
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
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
 * Full-width vertically stacked category cards (Stage 2 Home).
 */
export function HealthPerformanceCategoryGrid({
  cards: cardsProp,
}: HealthPerformanceCategoryGridProps): React.ReactElement {
  const router = useRouter();
  const cards = useMemo(
    () => cardsProp ?? buildHealthPerformanceCategoryCards(),
    [cardsProp],
  );

  return (
    <View style={styles.stack} testID="home-health-performance-grid">
      {cards.map((card) => (
        <HealthPerformanceCategoryCard
          key={card.id}
          model={card}
          variant="fullWidth"
          onPress={() => {
            router.push(card.href);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
    width: "100%",
  },
});
