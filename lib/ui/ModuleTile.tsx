import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";

export type ModuleTileProps = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function ModuleTile({
  title,
  subtitle,
  badge,
  onPress,
  disabled = false,
}: ModuleTileProps) {
  return (
    <Pressable
      onPress={() => {
        if (!disabled) onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.tile,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {/* Top row: title + optional badge */}
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {badge ? (
          <View style={[styles.badge, disabled && styles.badgeDisabled]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {/* Optional subtitle */}
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: "48%", // stable 2-column grid
    minHeight: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    justifyContent: "space-between",
  },

  pressed: {
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.5,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E5EA",
    alignSelf: "flex-start",
  },

  badgeDisabled: {
    backgroundColor: "#E5E5EA",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
});
