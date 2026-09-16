// lib/ui/home/HealthPerformanceCategoryCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  /** Always full-width stacked rows on Home. */
  variant?: "fullWidth";
};

export function HealthPerformanceCategoryCard({
  model,
  onPress,
  variant = "fullWidth",
}: HealthPerformanceCategoryCardProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint={model.accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        variant === "fullWidth" ? styles.cardFull : null,
        pressed ? styles.cardPressed : null,
      ]}
      testID={`home-category-card-${model.id}`}
    >
      <View style={styles.row}>
        <View style={styles.iconWell} accessible={false} importantForAccessibility="no">
          <Text style={styles.iconGlyph} accessible={false}>
            {glyphFor(model.id)}
          </Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.label} numberOfLines={2}>
            {model.label}
          </Text>
          {model.statusLabel ? (
            <Text style={styles.status} numberOfLines={1}>
              {model.statusLabel}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={UI_TEXT_MUTED}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
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
    minHeight: 64,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  cardFull: {
    width: "100%",
  },
  cardPressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconGlyph: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 21,
  },
  status: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
});
