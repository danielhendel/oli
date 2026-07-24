import {
  buildDailyMonitorActivityRatingLabel,
  buildOuraProviderSourceAccessibility,
  buildOuraRatingAccessibility,
  buildOuraScoreRatingAccessibility,
  mapActivityStepDescriptorToTone,
  mapOuraProviderRatingToTone,
  mapWorkoutAverageIntensityToLabel,
} from "../dailyMonitorPresentationRatings";
import { ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS } from "@/lib/utils/activityStepRating";
import { DASH_MONITOR_RATING_TONE_CHROME_DARK } from "@/lib/ui/theme/dashMonitorRatingToneChrome";

describe("dailyMonitorPresentationRatings", () => {
  it("uses Activity Today descriptors without so far and maps tones", () => {
    expect(buildDailyMonitorActivityRatingLabel(0).label).toBe("Sedentary");
    expect(buildDailyMonitorActivityRatingLabel(0).label).not.toMatch(/so far/i);
    expect(buildDailyMonitorActivityRatingLabel(6000).label).toBe("Lightly Active");
    expect(buildDailyMonitorActivityRatingLabel(8000).label).toBe("Moderately Active");
    expect(buildDailyMonitorActivityRatingLabel(11000).label).toBe("Active");
    expect(buildDailyMonitorActivityRatingLabel(13000).label).toBe("Very Active");
    expect(buildDailyMonitorActivityRatingLabel(16000).label).toBe("Highly Active");
    expect(buildDailyMonitorActivityRatingLabel(0).accessibilityLabel).toBe("Activity level Sedentary.");
    expect(buildDailyMonitorActivityRatingLabel(0).accessibilityLabel).not.toMatch(/so far/i);
    expect(buildDailyMonitorActivityRatingLabel(0).tone).toBe("critical");
    expect(buildDailyMonitorActivityRatingLabel(6000).tone).toBe("caution");
    expect(buildDailyMonitorActivityRatingLabel(11000).tone).toBe("positive");
    expect(buildDailyMonitorActivityRatingLabel(16000).tone).toBe("optimal");
    expect(ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS).toEqual([
      "Sedentary",
      "Lightly Active",
      "Moderately Active",
      "Active",
      "Very Active",
      "Highly Active",
    ]);
  });

  it("maps activity step descriptors to tones without embedding step thresholds", () => {
    expect(mapActivityStepDescriptorToTone(0)).toBe("critical");
    expect(mapActivityStepDescriptorToTone(4999)).toBe("critical");
    expect(mapActivityStepDescriptorToTone(5000)).toBe("caution");
    expect(mapActivityStepDescriptorToTone(9999)).toBe("caution");
    expect(mapActivityStepDescriptorToTone(10000)).toBe("positive");
    expect(mapActivityStepDescriptorToTone(14999)).toBe("positive");
    expect(mapActivityStepDescriptorToTone(15000)).toBe("optimal");
    const src = mapActivityStepDescriptorToTone.toString();
    expect(src).not.toMatch(/\b5000\b/);
    expect(src).not.toMatch(/\b7500\b/);
  });

  it("maps 0–10 average intensity to Low/Moderate/High/Very High", () => {
    expect(mapWorkoutAverageIntensityToLabel(0)?.label).toBe("Low");
    expect(mapWorkoutAverageIntensityToLabel(4)?.label).toBe("Low");
    expect(mapWorkoutAverageIntensityToLabel(5)?.label).toBe("Moderate");
    expect(mapWorkoutAverageIntensityToLabel(6)?.label).toBe("Moderate");
    expect(mapWorkoutAverageIntensityToLabel(6.9)?.label).toBe("Moderate");
    expect(mapWorkoutAverageIntensityToLabel(7)?.label).toBe("High");
    expect(mapWorkoutAverageIntensityToLabel(9)?.label).toBe("Very High");
    expect(mapWorkoutAverageIntensityToLabel(10)?.label).toBe("Very High");
    expect(mapWorkoutAverageIntensityToLabel(null)).toBeNull();
    expect(mapWorkoutAverageIntensityToLabel(11)).toBeNull();
    expect(mapWorkoutAverageIntensityToLabel(-1)).toBeNull();
  });

  it("does not classify Energy with Estimated or absolute-kcal bands", () => {
    expect(buildDailyMonitorActivityRatingLabel.toString()).not.toMatch(/Estimated/);
    expect(mapWorkoutAverageIntensityToLabel.toString()).not.toMatch(/PAL|kcal/i);
  });

  it("maps Oura provider labels to semantic tones without numeric thresholds", () => {
    expect(mapOuraProviderRatingToTone("Pay attention")).toBe("critical");
    expect(mapOuraProviderRatingToTone("Fair")).toBe("caution");
    expect(mapOuraProviderRatingToTone("Good")).toBe("positive");
    expect(mapOuraProviderRatingToTone("Optimal")).toBe("optimal");
    expect(mapOuraProviderRatingToTone(null)).toBeNull();
    expect(mapOuraProviderRatingToTone(undefined)).toBeNull();
    expect(mapOuraProviderRatingToTone("Elite")).toBeNull();
    expect(mapOuraProviderRatingToTone("Average")).toBeNull();
    // Tone mapper source must not embed score bands (owned by ouraScore.ts).
    const src = mapOuraProviderRatingToTone.toString();
    expect(src).not.toMatch(/\b85\b/);
    expect(src).not.toMatch(/\b70\b/);
    expect(src).not.toMatch(/\b60\b/);
  });

  it("resolves distinct chrome for each Oura tone (optimal is blue-family)", () => {
    expect(DASH_MONITOR_RATING_TONE_CHROME_DARK.critical.foreground).toMatch(/FFB3B8|#FF/i);
    expect(DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground).toMatch(/FFE08A|#FF/i);
    expect(DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground).toMatch(/B8F7CF|#B8/i);
    expect(DASH_MONITOR_RATING_TONE_CHROME_DARK.optimal.foreground).toMatch(/C9D9FF|#C9/i);
    expect(DASH_MONITOR_RATING_TONE_CHROME_DARK.optimal.background).toMatch(/58,\s*91,\s*219/);
  });

  it("builds distinct source and rating accessibility without color names", () => {
    expect(buildOuraProviderSourceAccessibility()).toBe("Source: Oura");
    expect(buildOuraRatingAccessibility("Optimal")).toBe("Rating Optimal.");
    expect(buildOuraScoreRatingAccessibility({ domain: "sleep", ratingLabel: "Optimal" })).toBe(
      "Rating Optimal.",
    );
    expect(buildOuraRatingAccessibility("Good")).not.toMatch(/blue|green|red|amber|color/i);
    expect(buildDailyMonitorActivityRatingLabel(11000).accessibilityLabel).not.toMatch(
      /blue|green|red|amber|color/i,
    );
  });
});
