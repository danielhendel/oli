import { describe, expect, it } from "@jest/globals";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";

describe("module overview dark pill chrome", () => {
  it("uses tinted backgrounds (not light cream) and opaque-ish text hues on Strength tier pills", () => {
    for (const row of MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME) {
      expect(row.pillBg.startsWith("rgba(")).toBe(true);
      expect(row.pillFg.startsWith("#")).toBe(true);
    }
  });

  it("maps Activity step rating tiers to dark-friendly pill fills", () => {
    for (const tier of ACTIVITY_STEP_RATING_TIERS) {
      expect(tier.backgroundColor.startsWith("rgba(")).toBe(true);
      expect(tier.color.startsWith("#")).toBe(true);
    }
  });
});
