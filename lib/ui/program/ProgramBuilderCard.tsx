// lib/ui/program/ProgramBuilderCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramBuilderCardModel, ProgramBuilderType } from "@/lib/data/program/types";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_SURFACE_PRESSED,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const BUILDER_ICON: Record<ProgramBuilderType, IconName> = {
  workout: "barbell-outline",
  cardio: "pulse-outline",
  nutrition: "nutrition-outline",
  recovery: "moon-outline",
};

export type ProgramBuilderCardProps = {
  model: ProgramBuilderCardModel;
  onPress?: (type: ProgramBuilderType) => void;
};

export function ProgramBuilderCard({ model, onPress }: ProgramBuilderCardProps): React.ReactElement {
  const { type, title, description, statusLabel, ctaLabel, disabled } = model;

  const accessibilityLabel = disabled
    ? `${title}. ${statusLabel}. ${description}`
    : `Open ${title}`;

  return (
    <Pressable
      testID={`program-builder-card-${type}`}
      onPress={() => {
        if (!disabled) onPress?.(type);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.card,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={BUILDER_ICON[type]} size={22} color={SYSTEM_ACCENT} />
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.ctaRow}>
        <Text style={[styles.ctaLabel, disabled && styles.ctaLabelDisabled]}>{ctaLabel}</Text>
        <Text style={[styles.chevron, disabled && styles.ctaLabelDisabled]}>{"\u203A"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 8,
    minHeight: 132,
    justifyContent: "flex-start",
  },
  cardDisabled: {
    opacity: 0.62,
  },
  cardPressed: {
    opacity: 0.88,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: UI_SURFACE_PRESSED,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  ctaLabelDisabled: {
    color: UI_TEXT_MUTED,
  },
  chevron: {
    fontSize: 18,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
});
