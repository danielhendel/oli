import { todayTargetAccessibilityLabel } from "@/lib/today/todayTargetAccessibility";
import type { TodayTargetProgress } from "@/lib/today/types";

const BASE_ROW: TodayTargetProgress = {
  id: "activity",
  label: "Activity",
  current: 4200,
  target: 10000,
  unit: "steps",
  progress: 0.42,
  displayValue: "4,200 / 10,000 steps",
  status: "inProgress",
  routeTarget: "/activity",
  usesDefaultTarget: false,
  includeInCompletion: true,
};

describe("todayTargetAccessibilityLabel", () => {
  it("includes percent complete for tracked targets", () => {
    expect(todayTargetAccessibilityLabel(BASE_ROW)).toContain("42 percent complete");
  });

  it("includes secondary line for informational workout row", () => {
    const row: TodayTargetProgress = {
      ...BASE_ROW,
      id: "workout",
      label: "Workout goal",
      displayValue: "0 today · 5/wk goal",
      includeInCompletion: false,
      secondaryLine: "Weekly preference · not a daily prescription",
      status: "notStarted",
      target: null,
    };
    expect(todayTargetAccessibilityLabel(row)).toContain("Weekly preference");
  });
});
