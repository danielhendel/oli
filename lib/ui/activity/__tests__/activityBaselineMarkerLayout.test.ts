import {
  ACTIVITY_BASELINE_PROGRESS_RIM_INSET_PX,
  activityBaselineProgressInnerWidthPx,
  activityBaselineThresholdCenterXInOuterPx,
  activityBaselineThresholdLabelLeftPx,
  activityBaselineThresholdTickLeftPx,
} from "@/lib/ui/activity/activityBaselineMarkerLayout";
import { ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS } from "@/lib/utils/activityStepRating";

describe("activityBaselineMarkerLayout", () => {
  const outer = 360;
  const inner = activityBaselineProgressInnerWidthPx(outer);
  const rim = ACTIVITY_BASELINE_PROGRESS_RIM_INSET_PX;

  it("inner width subtracts two rim insets from outer width", () => {
    expect(inner).toBeCloseTo(outer - 2 * rim, 5);
  });

  it("places 0 at the inner-track left edge on the bounded scale", () => {
    const cx0 = activityBaselineThresholdCenterXInOuterPx(outer, 0);
    expect(cx0).toBeCloseTo(rim, 5);
  });

  it("places 2.5k at one-sixth of the inner span", () => {
    const cx = activityBaselineThresholdCenterXInOuterPx(outer, 2500);
    const expected = rim + (2500 / ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS) * inner;
    expect(cx).toBeCloseTo(expected, 5);
  });

  it("centers 5k at the linear threshold on the inner track (in outer coords)", () => {
    const cx = activityBaselineThresholdCenterXInOuterPx(outer, 5000);
    const expected = rim + (5000 / ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS) * inner;
    expect(cx).toBeCloseTo(expected, 5);
  });

  it("centers 15k at the inner-track right edge on the bounded 0→15k scale", () => {
    const cx = activityBaselineThresholdCenterXInOuterPx(outer, 15000);
    expect(cx).toBeCloseTo(rim + inner, 5);
    const expected = rim + (15000 / ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS) * inner;
    expect(cx).toBeCloseTo(expected, 5);
  });

  it("label left clamps so the label stays inside the outer track", () => {
    const w = 40;
    const left = activityBaselineThresholdLabelLeftPx(outer, 5000, w);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + w).toBeLessThanOrEqual(outer);
  });

  it("tick left centers the tick on the same x as the label math", () => {
    const tickW = 2;
    const cx = activityBaselineThresholdCenterXInOuterPx(outer, 10000);
    const tickLeft = activityBaselineThresholdTickLeftPx(outer, 10000, tickW);
    expect(tickLeft + tickW / 2).toBeCloseTo(cx, 5);
  });
});
