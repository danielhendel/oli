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

import { UI_APPLE_HEALTH_HEART } from "@/lib/ui/theme/uiTokens";

/** Filled heart — Ionicons equivalent of SF Symbol `heart.fill`. */
export const BODY_APPLE_HEALTH_ICON_NAME = "heart" as const;
export const BODY_APPLE_HEALTH_ICON_SIZE = 20;
/** Semantic Apple Health heart red — not the Body indigo accent. */
export const BODY_APPLE_HEALTH_ICON_COLOR = UI_APPLE_HEALTH_HEART;

export type BodyAppleHealthSourceIconProps = {
  /** Defaults to {@link BODY_APPLE_HEALTH_ICON_COLOR}. */
  color?: string;
  size?: number;
  /** When true, hide from VoiceOver (parent Pressable already announces Apple Health). */
  decorative?: boolean;
};

export function BodyAppleHealthSourceIcon(props: BodyAppleHealthSourceIconProps) {
  const size = props.size ?? BODY_APPLE_HEALTH_ICON_SIZE;
  const color = props.color ?? BODY_APPLE_HEALTH_ICON_COLOR;
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
