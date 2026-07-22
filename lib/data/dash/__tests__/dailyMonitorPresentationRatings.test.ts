import {
  buildDailyMonitorActivityRatingLabel,
  buildDailyMonitorEnergyEstimatedRating,
  buildOuraProviderSourceAccessibility,
  buildOuraRatingAccessibility,
  buildOuraScoreRatingAccessibility,
  mapOuraProviderRatingToTone,
  mapWorkoutAverageIntensityToLabel,
} from "../dailyMonitorPresentationRatings";
import { DASH_MONITOR_RATING_TONE_CHROME_DARK } from "@/lib/ui/theme/dashMonitorRatingToneChrome";

describe("dailyMonitorPresentationRatings", () => {
  it("appends so far to Activity Today descriptors", () => {
    expect(buildDailyMonitorActivityRatingLabel(0).label).toBe("Sedentary so far");
    expect(buildDailyMonitorActivityRatingLabel(6000).label).toBe("Lightly Active so far");
    expect(buildDailyMonitorActivityRatingLabel(11000).label).toBe("Active so far");
    expect(buildDailyMonitorActivityRatingLabel(0).accessibilityLabel).toMatch(/Activity level/);
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

  it("uses Estimated for Energy when no normalized PAL classifier exists", () => {
    expect(buildDailyMonitorEnergyEstimatedRating().label).toBe("Estimated");
    expect(buildDailyMonitorEnergyEstimatedRating().accessibilityLabel).toMatch(
      /Estimated energy expenditure level/,
    );
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
  });
});
