import React from "react";
import { Platform, StyleSheet, Text, View, type TextStyle } from "react-native";

export type ActivityRatingPillProps = {
  label: string;
  /** Text color (darker / tier hue). */
  color: string;
  /** Soft background fill. */
  backgroundColor: string;
  /** Smaller, quieter chrome for Activity tier labels (bars carry color). */
  emphasis?: "default" | "subtle";
  /**
   * Activity step cards only: tighter padding + rim so the pill reads as supporting context
   * vs the step figure (Sleep and other callers omit).
   */
  compactChrome?: boolean;
  /** When false with compact subtle pills, skips the +1px top nudge used for baseline-aligned rows (use with alignItems center). */
  opticalBaselineNudge?: boolean;
  /** Optional override for label typography (e.g. Sleep metric pills). */
  labelTypography?: Pick<TextStyle, "fontSize" | "fontWeight" | "letterSpacing">;
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
  compactChrome = false,
  opticalBaselineNudge = true,
  labelTypography,
  testID,
}: ActivityRatingPillProps) {
  const subtle = emphasis === "subtle";
  const activityCompact = subtle && compactChrome;
  const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";
  const subtleLift =
    subtle && !compactChrome && os === "ios"
      ? {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
        }
      : subtle && !compactChrome && os === "android"
        ? { elevation: 1 }
        : {};

  return (
    <View
      style={[
        styles.shell,
        subtle ? styles.shellSubtle : null,
        activityCompact ? styles.shellSubtleActivityCompact : null,
        activityCompact && opticalBaselineNudge ? styles.shellActivityBaselineNudge : null,
        subtleLift,
        {
          backgroundColor,
          borderColor: subtle
            ? withAlphaFromHex(color, activityCompact ? 0.22 : 0.28)
            : withAlphaFromHex(color, 0.22),
          borderWidth: subtle ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text
        style={[subtle ? styles.textSubtle : styles.text, { color }, labelTypography]}
        numberOfLines={1}
        testID={testID}
      >
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
  shellSubtleActivityCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 26,
  },
  /** Optical alignment with baseline-aligned Activity row titles. */
  shellActivityBaselineNudge: {
    marginTop: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  textSubtle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.06,
  },
});
