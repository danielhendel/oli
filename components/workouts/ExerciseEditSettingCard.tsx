import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

export type ExerciseEditSettingCardProps = {
  /** Short field label (e.g. "Exercise name"). */
  title: string;
  /** Current value summary shown on the card. */
  value: string;
  onPressEdit: () => void;
  /** Accessibility label for the Edit control (e.g. "Edit exercise name"). */
  editAccessibilityLabel: string;
};

/**
 * White elevated card: label, current value, and a secondary-style Edit action.
 * Matches grouped-list / activity module density.
 */
export function ExerciseEditSettingCard({
  title,
  value,
  onPressEdit,
  editAccessibilityLabel,
}: ExerciseEditSettingCardProps): React.ReactElement {
  return (
    <View style={[styles.card, elevatedCardSurfaceStyle]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        <Text style={styles.value} numberOfLines={4} accessibilityRole="text">
          {value}
        </Text>
        <Pressable
          onPress={onPressEdit}
          accessibilityRole="button"
          accessibilityLabel={editAccessibilityLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.editPill, pressed && styles.editPillPressed]}
        >
          <Text style={styles.editPillText}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  value: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
  },
  editPill: {
    marginTop: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(60, 60, 67, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  editPillPressed: {
    opacity: 0.85,
  },
  editPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
