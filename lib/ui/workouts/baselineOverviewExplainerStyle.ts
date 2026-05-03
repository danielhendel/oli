import { StyleSheet } from "react-native";

import { UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/**
 * Explainer body under Baseline section titles (Cardio + Strength overview).
 * Single source of truth — keep Cardio and Strength baseline explainers visually identical.
 */
export const baselineOverviewExplainerStyles = StyleSheet.create({
  explainer: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.12,
  },
});
