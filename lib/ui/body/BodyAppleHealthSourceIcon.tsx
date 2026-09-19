/**
 * Apple Health / HealthKit identity for Body Composition source actions.
 *
 * Repository audit: no dedicated Apple Health brand asset exists.
 * Oli’s Health navigation (`HealthFab`) uses Ionicons `heart` / `heart-outline`
 * as the approved Health identity. We reuse filled `heart` here — not a fabricated Apple logo.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  UI_APPLE_HEALTH_HEART_MUTED,
  UI_APPLE_HEALTH_HEART_STRONG,
} from "@/lib/ui/theme/uiTokens";

/** Filled heart — Ionicons equivalent of SF Symbol `heart.fill`. */
export const BODY_APPLE_HEALTH_ICON_NAME = "heart" as const;
export const BODY_APPLE_HEALTH_ICON_SIZE = 20;

/** Strong red — popup header / Apple Health settings identity. */
export const BODY_APPLE_HEALTH_ICON_COLOR_STRONG = UI_APPLE_HEALTH_HEART_STRONG;
/** Muted red — Body metric-card source action only. */
export const BODY_APPLE_HEALTH_ICON_COLOR_MUTED = UI_APPLE_HEALTH_HEART_MUTED;
/** @deprecated Prefer STRONG or MUTED explicitly. Defaults to strong. */
export const BODY_APPLE_HEALTH_ICON_COLOR = BODY_APPLE_HEALTH_ICON_COLOR_STRONG;

export type BodyAppleHealthSourceIconAccent = "strong" | "muted";

export type BodyAppleHealthSourceIconProps = {
  /** Defaults to strong when omitted. */
  accent?: BodyAppleHealthSourceIconAccent;
  /** Explicit override — prefer `accent` when possible. */
  color?: string;
  size?: number;
  /** When true, hide from VoiceOver (parent Pressable already announces Apple Health). */
  decorative?: boolean;
};

export function BodyAppleHealthSourceIcon(props: BodyAppleHealthSourceIconProps) {
  const size = props.size ?? BODY_APPLE_HEALTH_ICON_SIZE;
  const color =
    props.color ??
    (props.accent === "muted"
      ? BODY_APPLE_HEALTH_ICON_COLOR_MUTED
      : BODY_APPLE_HEALTH_ICON_COLOR_STRONG);
  return (
    <View
      style={styles.wrap}
      importantForAccessibility={props.decorative === false ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={props.decorative !== false}
      testID="body-apple-health-heart-icon"
    >
      <Ionicons
        name={BODY_APPLE_HEALTH_ICON_NAME}
        size={size}
        color={color}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
