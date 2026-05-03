import { StyleSheet } from "react-native";

import { WORKOUTS_SCREEN_CONTENT_BG } from "@/lib/ui/headers/workoutsStackHeader";

/** Shared modal body chrome for Strength/Cardio range explainer screens (presentation-only). */
export const rangeExplainerSheetStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
    color: "#636366",
    letterSpacing: -0.2,
  },
  legendSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    gap: 0,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.28,
    marginTop: 4,
  },
  tierBlock: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60, 60, 67, 0.12)",
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.26,
  },
  tierRange: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
  tierBody: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: "#3C3C43",
    letterSpacing: -0.12,
    marginTop: 2,
  },
  personalCard: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  personalHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.08,
    textTransform: "uppercase",
  },
  personalLine: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    letterSpacing: -0.26,
  },
  personalEmphasis: {
    fontWeight: "700",
  },
  personalValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    color: "#3C3C43",
    letterSpacing: -0.15,
    fontVariant: ["tabular-nums"],
  },
});
