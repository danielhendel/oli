import { describe, expect, it } from "@jest/globals";
import { strengthThisWeekRowTitle } from "@/lib/ui/workouts/strengthThisWeekRowTitle";

describe("strengthThisWeekRowTitle", () => {
  it("returns trimmed session title when present", () => {
    expect(strengthThisWeekRowTitle("Chest & Triceps")).toBe("Chest & Triceps");
    expect(strengthThisWeekRowTitle("  Push Day  ")).toBe("Push Day");
  });

  it("returns Strength Training when missing or whitespace-only", () => {
    expect(strengthThisWeekRowTitle("")).toBe("Strength Training");
    expect(strengthThisWeekRowTitle("   ")).toBe("Strength Training");
    expect(strengthThisWeekRowTitle(null)).toBe("Strength Training");
    expect(strengthThisWeekRowTitle(undefined)).toBe("Strength Training");
  });
});
