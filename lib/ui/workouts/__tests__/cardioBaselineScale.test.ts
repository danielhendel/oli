import {
  CARDIO_BASELINE_MARKER_VALUES_MILES,
  CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01,
  CARDIO_BASELINE_TIER_SEGMENT_COUNT,
  CARDIO_WEEKLY_MILES_DISPLAY_MAX,
  cardioBaselineMarkerVisualPosition01,
  cardioBaselineMilesToVisualScale01,
} from "@/lib/ui/workouts/cardioBaselineScale";

describe("cardio baseline scale mapping", () => {
  it("places boundary ticks on equal-width tier positions (not linear miles)", () => {
    expect(CARDIO_BASELINE_MARKER_VALUES_MILES).toEqual([0, 2.5, 7.5, 15, 25, 40]);
    expect(CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01.length).toBe(6);
    expect(CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]);
    expect(cardioBaselineMarkerVisualPosition01(0)).toBeCloseTo(0, 10);
    expect(cardioBaselineMarkerVisualPosition01(2.5)).toBeCloseTo(1 / 6, 10);
    expect(cardioBaselineMarkerVisualPosition01(40)).toBeCloseTo(5 / 6, 10);
  });

  it("maps fill on equal-width tier scale with proportional advance within each mileage band", () => {
    expect(cardioBaselineMilesToVisualScale01(0)).toBeCloseTo(0, 10);
    expect(cardioBaselineMilesToVisualScale01(2.5)).toBeCloseTo(1 / CARDIO_BASELINE_TIER_SEGMENT_COUNT, 10);
    expect(cardioBaselineMilesToVisualScale01(7.5)).toBeCloseTo(2 / CARDIO_BASELINE_TIER_SEGMENT_COUNT, 10);
    expect(cardioBaselineMilesToVisualScale01(15)).toBeCloseTo(3 / CARDIO_BASELINE_TIER_SEGMENT_COUNT, 10);
    expect(cardioBaselineMilesToVisualScale01(25)).toBeCloseTo(4 / CARDIO_BASELINE_TIER_SEGMENT_COUNT, 10);
    expect(cardioBaselineMilesToVisualScale01(40)).toBeCloseTo(5 / CARDIO_BASELINE_TIER_SEGMENT_COUNT, 10);
    expect(cardioBaselineMilesToVisualScale01(45)).toBeCloseTo(1, 10);
    expect(cardioBaselineMilesToVisualScale01(100)).toBeCloseTo(1, 10);
    expect(cardioBaselineMilesToVisualScale01(CARDIO_WEEKLY_MILES_DISPLAY_MAX / 2)).not.toBeCloseTo(0.5, 2);
  });
});
