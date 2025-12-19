import { Pressable, Text, StyleSheet } from "react-native";

export type ModuleTileProps = {
  id: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function ModuleTile({
  title,
  subtitle,
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
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7 },
});
