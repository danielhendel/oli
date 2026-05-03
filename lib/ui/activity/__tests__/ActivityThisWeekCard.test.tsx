import React from "react";
import renderer, { act } from "react-test-renderer";

import type { ActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import { ActivityThisWeekCard } from "@/lib/ui/activity/ActivityThisWeekCard";

const MODEL: ActivityThisWeekCardModel = {
  compactValuePrimary: "8,000 steps/day",
  ratingLabel: "High",
  activityTierIndexForBar: 3,
  fillWidth01Override: 0.5,
  isEmpty: false,
  days: [
    {
      dayKey: "2026-05-01",
      dateLabel: "Friday",
      stepsDigits: "12,345",
      deltaText: "+1.2k",
    },
  ],
};

describe("ActivityThisWeekCard", () => {
  it("renders weekday above steps line inside primary accent row bar", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityThisWeekCard loading={false} model={MODEL} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Friday");
    expect(json).toContain("12,345 steps");
    expect(json).toContain("+1.2k");
    expect(json).toContain("activity-this-week-day-row-bar");
  });
});
