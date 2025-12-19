import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

type Props = {
  label?: string; // defaults to gear
  onPress: () => void;
  accessibilityLabel: string;
  style?: ViewStyle;
};

export function HeaderIconButton({
  label = "⚙️",
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    fontSize: 18,
  },
});
