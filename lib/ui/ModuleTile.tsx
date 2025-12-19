// lib/ui/ModuleTile.tsx

import { Pressable, Text, StyleSheet, View } from "react-native";

export type ModuleTileProps = {
  id: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
};

export function ModuleTile({
  title,
  subtitle,
  onPress,
  disabled = false,
  badge,
}: ModuleTileProps) {
  return (
    <Pressable
      onPress={() => {
        if (!disabled) onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.tile,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>

        {badge ? (
          <View style={[styles.badge, disabled ? styles.badgeDisabled : null]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: { fontSize: 18, fontWeight: "700" },

  subtitle: { fontSize: 14, opacity: 0.7 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1C1C1E",
  },
  badgeDisabled: {
    backgroundColor: "#3A3A3C",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
