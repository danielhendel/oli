// lib/ui/ModuleSectionLinkRow.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { UI_SCREEN_BG, UI_SURFACE_PRESSED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type ModuleSectionLinkRowProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

export function ModuleSectionLinkRow({
  title,
  subtitle,
  badge,
  disabled = false,
  onPress,
  testID,
  accessibilityLabel,
}: ModuleSectionLinkRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!disabled) onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
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

      {badge ? (
        <View style={[styles.badge, disabled && styles.badgeDisabled]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Text style={styles.chevron} accessibilityLabel="Open">
          ›
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: UI_SCREEN_BG,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },

  left: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: "700", color: UI_TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: UI_TEXT_SECONDARY },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: UI_SURFACE_PRESSED,
  },
  badgeDisabled: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    opacity: 0.95,
  },

  chevron: {
    fontSize: 22,
    color: UI_TEXT_SECONDARY,
    paddingLeft: 6,
  },
});
