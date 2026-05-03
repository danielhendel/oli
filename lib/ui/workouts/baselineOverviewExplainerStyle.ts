import { StyleSheet } from "react-native";

/**
 * Explainer body under Baseline section titles (Cardio + Strength overview).
 * Single source of truth — keep Cardio and Strength baseline explainers visually identical.
 */
export const baselineOverviewExplainerStyles = StyleSheet.create({
  explainer: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
    color: "#636366",
    letterSpacing: -0.12,
  },
});
