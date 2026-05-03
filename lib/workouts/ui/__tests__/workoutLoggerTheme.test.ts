import {
  WORKOUT_LOGGER_BOTTOM_BAR,
  WORKOUT_LOGGER_COLORS,
  WORKOUT_LOGGER_LAYOUT,
  workoutLoggerTypography,
} from "../workoutLoggerTheme";

describe("workoutLoggerTheme", () => {
  it("defines shared sheet layout and frosted bottom bar", () => {
    expect(WORKOUT_LOGGER_LAYOUT.sheetTopRadius).toBe(22);
    expect(WORKOUT_LOGGER_LAYOUT.sheetHorizontalPadding).toBe(20);
    expect(WORKOUT_LOGGER_LAYOUT.optionCardRadius).toBe(16);
    expect(WORKOUT_LOGGER_BOTTOM_BAR.backgroundColor).toBe("rgba(24, 28, 34, 0.72)");
    expect(WORKOUT_LOGGER_COLORS.sheetChromeBackground).toBe("#0B0D10");
  });

  it("defines typography scale for sheets and options", () => {
    expect(workoutLoggerTypography.pageTimer.fontSize).toBe(21);
    expect(workoutLoggerTypography.sheetTitle.fontSize).toBe(24);
    expect(workoutLoggerTypography.sheetBody.fontSize).toBe(16);
    expect(workoutLoggerTypography.optionTitle.fontSize).toBe(17);
    expect(workoutLoggerTypography.optionDescription.fontSize).toBe(15);
    expect(workoutLoggerTypography.commandBarLabel.fontSize).toBe(13);
    expect(workoutLoggerTypography.sectionChip.letterSpacing).toBe(0.6);
  });
});
