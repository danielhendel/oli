import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label?: string; // defaults to gear
  onPress: () => void;
  accessibilityLabel: string;
  style?: ViewStyle;
  /** Optional Ionicons name; when provided, renders icon instead of text label. */
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  iconSize?: number;
};

export function HeaderIconButton({
  label = "⚙️",
  onPress,
  accessibilityLabel,
  style,
  iconName,
  color = "#1C1C1E",
  iconSize = 20,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      {iconName ? (
        <Ionicons name={iconName} size={iconSize} color={color} />
      ) : (
        <Text style={[styles.text, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    fontSize: 18,
  },
});
