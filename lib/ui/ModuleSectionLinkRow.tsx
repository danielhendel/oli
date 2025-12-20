// lib/ui/ModuleSectionLinkRow.tsx

import { Pressable, StyleSheet, Text, View } from "react-native";

export type ModuleSectionLinkRowProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function ModuleSectionLinkRow({
  title,
  subtitle,
  badge,
  onPress,
  disabled = false,
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
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        {badge ? (
          <View style={[styles.badge, disabled && styles.badgeDisabled]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },

  left: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 13, opacity: 0.7 },

  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  chevron: { fontSize: 22, opacity: 0.6, marginTop: -1 },
  chevronDisabled: { opacity: 0.35 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E5EA",
  },
  badgeDisabled: { backgroundColor: "#E5E5EA" },
  badgeText: { fontSize: 12, fontWeight: "700", opacity: 0.9 },
});
