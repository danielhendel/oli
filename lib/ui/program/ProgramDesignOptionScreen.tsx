// lib/ui/program/ProgramDesignOptionScreen.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramDesignOptionItem<TId extends string> = {
  id: TId;
  label: string;
};

export type ProgramDesignOptionScreenProps<TId extends string> = {
  /** Short helper line under the header (e.g. "Choose your program type"). */
  description: string;
  options: readonly ProgramDesignOptionItem<TId>[];
  selectedId: TId | null;
  onSelect: (id: TId) => void;
  /** Used to namespace testIDs and the scroll a11y label. */
  testIDPrefix: string;
  accessibilityLabel: string;
};

/**
 * Generic single-select list used by the Type, Training Level, and Duration setup pages.
 * Apple-style: tapping a row selects it (caller persists to the draft + navigates back).
 * Each row is a ≥44pt button with a checkmark on the active option.
 */
export function ProgramDesignOptionScreen<TId extends string>({
  description,
  options,
  selectedId,
  onSelect,
  testIDPrefix,
  accessibilityLabel,
}: ProgramDesignOptionScreenProps<TId>): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.description}>{description}</Text>
      <View style={styles.card}>
        {options.map((option, index) => {
          const selected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              testID={`${testIDPrefix}-option-${option.id}`}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.label} numberOfLines={1}>
                {option.label}
              </Text>
              {selected ? (
                <Ionicons name="checkmark" size={20} color={SYSTEM_ACCENT} />
              ) : (
                <View style={styles.checkSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
    marginBottom: 14,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 52,
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
  label: {
    flex: 1,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
  },
  checkSpacer: {
    width: 20,
    height: 20,
  },
});
