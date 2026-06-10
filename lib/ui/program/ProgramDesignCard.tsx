// lib/ui/program/ProgramDesignCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProgramDesignRowModel } from "@/lib/data/program/workoutProgramDesignTypes";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { ProgramDesignRow } from "@/lib/ui/program/ProgramDesignRow";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramDesignCardProps = {
  rows: ProgramDesignRowModel[];
  onSelectCategory: (row: ProgramDesignRowModel) => void;
};

/**
 * The single primary "Program Design" card. Renders the category rows as a grouped list
 * (Apple-style), each navigating to its setup page.
 */
export function ProgramDesignCard({
  rows,
  onSelectCategory,
}: ProgramDesignCardProps): React.ReactElement {
  return (
    <View style={styles.card} testID="program-design-card">
      <Text style={styles.title} accessibilityRole="header">
        Program Design
      </Text>
      <Text style={styles.subtitle}>
        Configure your program. Tap a category to set it up.
      </Text>
      <View style={styles.rows}>
        {rows.map((row, index) => (
          <ProgramDesignRow
            key={row.id}
            model={row}
            onPress={onSelectCategory}
            showDivider={index > 0}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  rows: {
    marginTop: 2,
  },
});
