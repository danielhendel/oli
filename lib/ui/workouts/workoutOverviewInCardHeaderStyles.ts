import { StyleSheet } from "react-native";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

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
  link: { fontSize: 15, fontWeight: "600", color: SYSTEM_ACCENT, letterSpacing: -0.2 },
  /** Matches HeaderIconButton / link rows: quiet opacity on press. */
  linkPressed: { opacity: 0.55 },
});
