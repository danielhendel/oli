// lib/ui/home/HealthPerformanceCategoryCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { HealthPerformanceCategoryCardModel } from "@/lib/home/healthPerformanceCategories";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type HealthPerformanceCategoryCardProps = {
  model: HealthPerformanceCategoryCardModel;
  onPress: () => void;
  /** Last card may span full width in a two-column grid. */
  fullWidth?: boolean;
};

export function HealthPerformanceCategoryCard({
  model,
  onPress,
  fullWidth = false,
}: HealthPerformanceCategoryCardProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint={model.accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        fullWidth ? styles.cardFull : styles.cardHalf,
        pressed ? styles.cardPressed : null,
      ]}
      testID={`home-category-card-${model.id}`}
    >
      <View style={styles.iconWell} accessible={false} importantForAccessibility="no">
        <Text style={styles.iconGlyph} accessible={false}>
          {glyphFor(model.id)}
        </Text>
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {model.label}
      </Text>
      {model.statusLabel ? (
        <Text style={styles.status} numberOfLines={1}>
          {model.statusLabel}
        </Text>
      ) : (
        <Text style={styles.chevron} accessible={false}>
          View
        </Text>
      )}
    </Pressable>
  );
}

function glyphFor(id: HealthPerformanceCategoryCardModel["id"]): string {
  switch (id) {
    case "body_composition":
      return "◎";
    case "strength":
      return "▹";
    case "cardio_fitness":
      return "⌁";
    case "nutrition":
      return "◌";
    case "sleep":
      return "☾";
    case "recovery":
      return "↺";
    case "health":
      return "✚";
    default:
      return "·";
  }
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  cardHalf: {
    flexGrow: 1,
    flexBasis: "47%",
    maxWidth: "48.5%",
  },
  cardFull: {
    width: "100%",
  },
  cardPressed: {
    opacity: 0.88,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  iconGlyph: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  status: {
    marginTop: 8,
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  chevron: {
    marginTop: 8,
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
});
