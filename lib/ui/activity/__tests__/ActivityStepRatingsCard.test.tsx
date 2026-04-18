import React from "react";
import renderer, { act } from "react-test-renderer";

import { ActivityStepRatingsCard } from "@/lib/ui/activity/ActivityStepRatingsCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("ActivityStepRatingsCard", () => {
  it("starts collapsed: header only, no tier list or progress bar", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ActivityStepRatingsCard />);
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Step Ratings");
    expect(str).toContain("activity-step-ratings-toggle");
    expect(str).not.toContain("Your daily step count reflects your overall activity level");
    expect(str).not.toContain("activity-step-ratings-tier-list");
    expect(str).not.toContain("activity-step-ratings-track");
  });

  it("expands to explainer, tier rows, and color dots (no progress bar)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ActivityStepRatingsCard />);
    });
    const toggle = tree.root.findByProps({ testID: "activity-step-ratings-toggle" });
    act(() => {
      toggle.props.onPress();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Your daily step count reflects your overall activity level");
    expect(str).toContain("activity-step-ratings-tier-list");
    expect(str).toContain("activity-step-ratings-tier-0");
    expect(str).toContain("activity-step-ratings-tier-dot-0");
    expect(str).toContain("under 5,000");
    expect(str).not.toContain("activity-step-ratings-track");
  });
});
