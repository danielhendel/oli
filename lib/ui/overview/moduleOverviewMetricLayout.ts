import { StyleSheet } from "react-native";

/**
 * Shared vertical rhythm for overview metric blocks (label + pill cluster, trailing value, bar below).
 * Used by Strength Overview card and Body Composition Overview card.
 */
export const moduleOverviewMetricLayoutStyles = StyleSheet.create({
  metricGroups: {
    gap: 20,
  },
  metricBlock: {
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  titlePillCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C1C1E",
    flexShrink: 0,
  },
  trailingValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3C3C43",
    letterSpacing: -0.15,
    flexShrink: 0,
    maxWidth: "42%",
    textAlign: "right",
  },
  ratingPillShell: {
    flexShrink: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: "46%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  ratingPillLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
});
