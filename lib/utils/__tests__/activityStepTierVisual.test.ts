import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";
import { ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX } from "@/lib/ui/overview/activityStepTierBarFills";
import {
  STEP_TIER_COLORS,
  STEP_TIER_FILL,
  activityStepTierBarVisual,
  getStepTier,
} from "@/lib/utils/activityStepTierVisual";

describe("activityStepTierVisual", () => {
  it("getStepTier mirrors tier index thresholds", () => {
    expect(getStepTier(4000)).toBe("low");
    expect(getStepTier(6000)).toBe("belowAvg");
    expect(getStepTier(8000)).toBe("average");
    expect(getStepTier(11000)).toBe("good");
    expect(getStepTier(13000)).toBe("great");
    expect(getStepTier(16000)).toBe("elite");
  });

  it("uses fixed fill lengths per tier (Good < Elite)", () => {
    expect(STEP_TIER_FILL.good).toBe(0.66);
    expect(STEP_TIER_FILL.elite).toBe(1);
    expect(activityStepTierBarVisual(3)?.fill01).toBe(0.66);
    expect(activityStepTierBarVisual(5)?.fill01).toBe(1);
  });

  it("returns null visual for unknown tier index", () => {
    expect(activityStepTierBarVisual(null)).toBeNull();
  });

  it("uses Body segment zone fills except distinct Activity greens for Good and Great", () => {
    expect(STEP_TIER_COLORS.low).toBe(MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[0]!]);
    expect(STEP_TIER_COLORS.belowAvg).toBe(MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[1]!]);
    expect(STEP_TIER_COLORS.average).toBe(MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[2]!]);
    expect(STEP_TIER_COLORS.good).toBe("rgba(127, 191, 159, 0.35)");
    expect(STEP_TIER_COLORS.great).toBe("rgba(78, 210, 111, 0.35)");
    expect(STEP_TIER_COLORS.elite).toBe(MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[5]!]);
  });
});
