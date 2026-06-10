// lib/ui/program/ProgramDesignRow.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramDesignRowModel } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramDesignRowProps = {
  model: ProgramDesignRowModel;
  onPress: (row: ProgramDesignRowModel) => void;
  /** Whether to draw the hairline divider above this row (false for the first row). */
  showDivider: boolean;
};

/**
 * A single tappable Program Design category row: title on the left, the current selected
 * value (or "Not set") + chevron on the right. ≥44pt touch target, button role/label.
 */
export function ProgramDesignRow({
  model,
  onPress,
  showDivider,
}: ProgramDesignRowProps): React.ReactElement {
  return (
    <Pressable
      testID={`program-design-row-${model.id}`}
      onPress={() => onPress(model)}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.title} numberOfLines={1}>
        {model.title}
      </Text>
      <View style={styles.right}>
        <Text
          style={[styles.value, !model.isSet && styles.valueMuted]}
          numberOfLines={1}
        >
          {model.valueLabel}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  rowPressed: {
    opacity: 0.6,
  },
  title: {
    flexShrink: 0,
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  right: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  value: {
    flexShrink: 1,
    fontSize: 15,
    color: UI_TEXT_SECONDARY,
    textAlign: "right",
  },
  valueMuted: {
    color: UI_TEXT_MUTED,
  },
});
