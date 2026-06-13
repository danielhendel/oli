import {
  NUTRITION_LOG_HUB_PATHNAME,
  nutritionLogHubHref,
} from "@/lib/nutrition/nutritionLogHubRoutes";
import type { NutritionLogHubMode } from "@/lib/ui/nutrition/NutritionLogHub";

const MODES: NutritionLogHubMode[] = ["search", "kitchen", "meals", "supplements", "manual", "scan"];

describe("nutritionLogHubHref", () => {
  it("threads the selected day into every mode's route", () => {
    for (const mode of MODES) {
      const href = nutritionLogHubHref(mode, "2026-03-15");
      expect(href.params.day).toBe("2026-03-15");
      expect(href.pathname).toBe(NUTRITION_LOG_HUB_PATHNAME[mode]);
    }
  });

  it("maps manual to the quick-add log screen", () => {
    expect(nutritionLogHubHref("manual", "2026-03-15").pathname).toBe("/(app)/nutrition/log");
  });

  it("never drops the day (no today fallback at the routing layer)", () => {
    const href = nutritionLogHubHref("search", "2025-12-31");
    expect(href.params.day).toBe("2025-12-31");
  });
});
