import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type ModuleSectionLinkRowProps = {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onPress?: () => void;
};

export function ModuleSectionLinkRow({
  title,
  subtitle,
  disabled = false,
  onPress,
}: ModuleSectionLinkRowProps) {
  return (
    <Pressable
      onPress={() => {
        if (!disabled) onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },

  textCol: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "800" },
  subtitle: { fontSize: 13, opacity: 0.7 },

  chevron: { fontSize: 22, opacity: 0.5 },
  chevronDisabled: { opacity: 0.25 },
});
