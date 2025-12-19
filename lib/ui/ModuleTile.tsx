// lib/ui/ModuleTile.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

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
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.tile,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, disabled && styles.titleDisabled]}>{title}</Text>

        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {subtitle ? (
        <Text style={[styles.subtitle, disabled && styles.subtitleDisabled]}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  titleDisabled: {
    opacity: 0.55,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.75,
  },
  subtitleDisabled: {
    opacity: 0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#9B9BA0",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.5,
  },
});
