import { StyleSheet } from "react-native";

import { UI_LINK_SECONDARY } from "@/lib/ui/theme/uiTokens";

/**
 * Shared title row for Workouts Overview in-card section headers:
 * analytics year, workout log, and recent workouts.
 */
export const workoutOverviewInCardHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.35,
  },
  linkHit: { paddingVertical: 4, paddingLeft: 8 },
  link: { fontSize: 15, fontWeight: "600", color: UI_LINK_SECONDARY, letterSpacing: -0.2 },
  /** Secondary action — subtle press without accent flash. */
  linkPressed: { opacity: 0.62 },
});
