import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

export type ActivityRatingPillProps = {
  label: string;
  /** Text color (darker / tier hue). */
  color: string;
  /** Soft background fill. */
  backgroundColor: string;
  /** Smaller, quieter chrome for Activity tier labels (bars carry color). */
  emphasis?: "default" | "subtle";
  testID?: string;
};

/**
 * Capsule for the active step tier (Today’s Steps + Overview rows).
 * Layout is static (no scale/opacity animation) so labels never clip in flex rows.
 */
export function ActivityRatingPill({
  label,
  color,
  backgroundColor,
  emphasis = "default",
  testID,
}: ActivityRatingPillProps) {
  const subtle = emphasis === "subtle";
  const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";
  const subtleLift =
    subtle && os === "ios"
      ? {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
        }
      : subtle && os === "android"
        ? { elevation: 1 }
        : {};

  return (
    <View
      style={[
        styles.shell,
        subtle ? styles.shellSubtle : null,
        subtleLift,
        {
          backgroundColor,
          borderColor: subtle ? withAlphaFromHex(color, 0.28) : withAlphaFromHex(color, 0.22),
          borderWidth: subtle ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[subtle ? styles.textSubtle : styles.text, { color }]} numberOfLines={1} testID={testID}>
        {label}
      </Text>
    </View>
  );
}

function withAlphaFromHex(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return `rgba(60, 60, 67, ${alpha * 0.35})`;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: "center",
    borderRadius: 9999,
    flexShrink: 0,
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
  },
  shellSubtle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 30,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  textSubtle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.05,
  },
});
