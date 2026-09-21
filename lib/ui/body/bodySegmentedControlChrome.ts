/**
 * Shared Body segmented-control chrome — Weight card lb/BMI toggle and detail range selector.
 * Keep these surfaces visually identical.
 */
import { StyleSheet } from "react-native";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export const bodySegmentedControlStyles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "rgba(120,120,128,0.16)",
    borderRadius: 8,
    padding: 2,
    minHeight: 44,
    alignItems: "center",
  },
  segment: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Slightly wider padding for 2-option card toggles (lb/BMI). */
  segmentComfortable: {
    minWidth: 40,
    paddingHorizontal: 10,
    flexGrow: 0,
    flexShrink: 0,
  },
  segmentActive: {
    backgroundColor: UI_CARD_SURFACE,
  },
  text: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
  },
  textActive: {
    color: UI_TEXT_PRIMARY,
  },
});
