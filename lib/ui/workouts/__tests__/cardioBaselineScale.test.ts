import {
  cardioBaselineMarkerVisualPosition01,
  cardioBaselineMilesToVisualScale01,
  CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01,
  CARDIO_BASELINE_MARKER_VALUES_MILES,
} from "@/lib/ui/workouts/cardioBaselineScale";

describe("cardio baseline scale mapping", () => {
  it("maps tick markers to evenly spaced visual positions", () => {
    expect(cardioBaselineMarkerVisualPosition01(0)).toBeCloseTo(0, 10);
    expect(cardioBaselineMarkerVisualPosition01(2.5)).toBeCloseTo(0.25, 10);
    expect(cardioBaselineMarkerVisualPosition01(7.5)).toBeCloseTo(0.5, 10);
    expect(cardioBaselineMarkerVisualPosition01(15)).toBeCloseTo(0.75, 10);
    expect(cardioBaselineMarkerVisualPosition01(25)).toBeCloseTo(1, 10);
    expect(CARDIO_BASELINE_MARKER_VALUES_MILES).toEqual([0, 2.5, 7.5, 15, 25]);
    expect(CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("maps fill across visual tier scale segments", () => {
    expect(cardioBaselineMilesToVisualScale01(2.5)).toBeCloseTo(0.25, 10);
    expect(cardioBaselineMilesToVisualScale01(3.0)).toBeGreaterThan(0.25);
    expect(cardioBaselineMilesToVisualScale01(3.0)).toBeLessThan(0.5);
    expect(cardioBaselineMilesToVisualScale01(7.5)).toBeCloseTo(0.5, 10);
    expect(cardioBaselineMilesToVisualScale01(15)).toBeCloseTo(0.75, 10);
    expect(cardioBaselineMilesToVisualScale01(25)).toBeCloseTo(1, 10);
  });
});
