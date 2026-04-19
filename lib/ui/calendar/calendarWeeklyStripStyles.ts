import { StyleSheet } from "react-native";

import { UI_TEXT_PRIMARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL } from "@/lib/ui/calendar/weeklyCalendarStripTheme";

/** Shared layout for {@link WeeklyStrip}, {@link BodyWeeklyStrip}, {@link NutritionWeeklyStrip}. */
export const calendarWeeklyStripStyles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 0,
    paddingBottom: 2,
    paddingTop: 0,
  },
  row: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  dayCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  dayCellSelected: {},
  dayCellPressed: {
    opacity: 0.7,
  },
  dayOfWeek: {
    fontSize: 13,
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 2,
  },
  dayOfWeekWhenSelected: {
    fontWeight: "700",
    letterSpacing: -0.12,
  },
  /** Sleep strip: quieter weekdays when not selected. */
  dayOfWeekSleepMuted: {
    fontSize: 12,
    fontWeight: "500",
    color: "#AEAEB2",
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dayRingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  dayNumberWhenSelected: {
    fontWeight: "700",
    fontSize: 19,
    letterSpacing: -0.35,
  },
  /** Sleep strip: quieter date numerals when not selected. */
  dayNumberSleepMuted: {
    fontSize: 17,
    fontWeight: "500",
    color: "#AEAEB2",
  },
});
