import {
  buildDailyMonitorActivityRatingLabel,
  buildDailyMonitorEnergyEstimatedRating,
  buildOuraScoreRatingAccessibility,
  mapWorkoutAverageIntensityToLabel,
} from "../dailyMonitorPresentationRatings";

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

  it("builds Oura rating accessibility without inventing scores", () => {
    expect(buildOuraScoreRatingAccessibility({ domain: "sleep", ratingLabel: "Optimal" })).toBe(
      "Oura sleep rating: Optimal",
    );
    expect(
      buildOuraScoreRatingAccessibility({ domain: "readiness", ratingLabel: "Good" }),
    ).toBe("Oura readiness rating: Good");
  });
});
