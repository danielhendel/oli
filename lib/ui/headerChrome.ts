import { Platform, StyleSheet, type ViewStyle } from "react-native";

import { UI_HEADER_CHROME_BG, UI_HEADER_CHROME_BORDER, UI_HEADER_CAPSULE_DIVIDER, UI_HEADER_CAPSULE_PADDING_H, UI_HEADER_CAPSULE_SEGMENT_GAP } from "@/lib/ui/theme/uiTokens";

/** iOS shadow aligned with nutrition dock “slot” treatment — softer than the full dock. */
const HEADER_CHROME_SHADOW_IOS = {
  shadowColor: "#000000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
} as const;

const HEADER_CHROME_SHADOW_ANDROID = {
  elevation: 2,
} as const;

/** `Platform` can be undefined under partial Jest mocks — fall back to no shadow. */
const platformOs = Platform?.OS;

export const headerChromeShadow = (
  platformOs === "ios"
    ? HEADER_CHROME_SHADOW_IOS
    : platformOs === "android"
      ? HEADER_CHROME_SHADOW_ANDROID
      : {}
) as ViewStyle;

/** Circular controls (back). */
export const headerChromeCircleShell = {
  backgroundColor: UI_HEADER_CHROME_BG,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: UI_HEADER_CHROME_BORDER,
  ...headerChromeShadow,
};

/** Grouped trailing capsule (calendar + overflow). */
export const headerChromeCapsuleShell = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: UI_HEADER_CHROME_BG,
  borderRadius: 20,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: UI_HEADER_CHROME_BORDER,
  paddingHorizontal: UI_HEADER_CAPSULE_PADDING_H,
  gap: UI_HEADER_CAPSULE_SEGMENT_GAP,
  ...headerChromeShadow,
};

/** One tappable region inside the trailing capsule (40×40 target). */
export const headerChromeCapsuleSegmentBase = {
  minWidth: 40,
  minHeight: 40,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

export const headerChromeCapsuleSegmentPressed = {
  opacity: 0.72,
};

/** ~65% of 40pt capsule height, centered; 1px for crisp separation. */
const HEADER_CAPSULE_DIVIDER_HEIGHT = 26;

export const headerChromeCapsuleDivider = {
  width: 1,
  height: HEADER_CAPSULE_DIVIDER_HEIGHT,
  alignSelf: "center" as const,
  backgroundColor: UI_HEADER_CAPSULE_DIVIDER,
};
