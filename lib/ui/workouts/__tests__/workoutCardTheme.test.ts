import { UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { baselineOverviewExplainerStyles } from "@/lib/ui/workouts/baselineOverviewExplainerStyle";
import { RECENT_WORKOUT_ROW_META_TEXT_STYLE } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

describe("workout baseline overview explainer", () => {
  it("uses textSecondary for shared baseline section explainer copy", () => {
    expect(baselineOverviewExplainerStyles.explainer.color).toBe(UI_TEXT_SECONDARY);
  });

  it("uses textSecondary for Today / This Week meta and subtitle lines", () => {
    expect(RECENT_WORKOUT_ROW_META_TEXT_STYLE.color).toBe(UI_TEXT_SECONDARY);
  });
});
