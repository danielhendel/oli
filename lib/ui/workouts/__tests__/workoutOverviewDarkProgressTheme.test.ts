import { describe, expect, it } from "@jest/globals";
import { UI_PROGRESS_TRACK_EMPTY } from "@/lib/ui/theme/uiTokens";
import {
  WORKOUT_OVERVIEW_PROGRESS_FILL_ACTIVITY,
  WORKOUT_OVERVIEW_PROGRESS_FILL_CARDIO,
  WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH,
  WORKOUT_STRENGTH_PROGRESS_FILL,
  WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
  WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL,
  WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";

describe("workoutOverviewAnalyticsTheme (dark progress)", () => {
  it("uses semantic empty track token for overview/day linear bars", () => {
    expect(WORKOUT_STRENGTH_PROGRESS_TRACK_BG).toBe(UI_PROGRESS_TRACK_EMPTY);
  });

  it("uses saturated fills tuned for dark elevated cards", () => {
    expect(WORKOUT_OVERVIEW_PROGRESS_FILL_ACTIVITY).toMatch(/^#/);
    expect(WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH).toMatch(/^#/);
    expect(WORKOUT_OVERVIEW_PROGRESS_FILL_CARDIO).toMatch(/^#/);
    expect(WORKOUT_STRENGTH_PROGRESS_FILL).toBe(WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH);
    expect(WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL).toBe(WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH);
    expect(WORKOUT_OVERVIEW_PROGRESS_FILL_ACTIVITY.toLowerCase()).not.toBe("#e5e5ea");
    expect(WORKOUT_STRENGTH_PROGRESS_TRACK_BG.toLowerCase()).not.toBe("#e5e5ea");
  });

  it("uses a neutral progress fill for the Volume per Muscle Group card distinct from strength green", () => {
    expect(WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL).not.toBe(WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL);
    expect(WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL).not.toBe(WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH);
    expect(WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL.toLowerCase()).not.toContain("eb7a");
    expect(WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL.toLowerCase()).not.toContain("d966");
  });
});
