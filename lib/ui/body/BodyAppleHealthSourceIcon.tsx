/**
 * Apple Health / HealthKit identity for Body Composition source actions.
 *
 * Repository audit: no dedicated Apple Health brand asset exists.
 * Oli’s Health navigation (`HealthFab`) uses Ionicons `heart` / `heart-outline`
 * as the approved Health identity. We reuse `heart` here — not a fabricated Apple logo.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const BODY_APPLE_HEALTH_ICON_NAME = "heart" as const;
export const BODY_APPLE_HEALTH_ICON_SIZE = 18;

export type BodyAppleHealthSourceIconProps = {
  color: string;
  size?: number;
  /** When true, hide from VoiceOver (parent Pressable already announces Apple Health). */
  decorative?: boolean;
};

export function BodyAppleHealthSourceIcon(props: BodyAppleHealthSourceIconProps) {
  const size = props.size ?? BODY_APPLE_HEALTH_ICON_SIZE;
  return (
    <View
      style={styles.wrap}
      importantForAccessibility={props.decorative === false ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={props.decorative !== false}
    >
      <Ionicons
        name={BODY_APPLE_HEALTH_ICON_NAME}
        size={size}
        color={props.color}
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
