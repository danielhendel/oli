import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildActivityMonthlyStepsAnalyticsModel } from "@/lib/data/activity/activityMonthlyStepsAnalyticsModel";

const mockUseActivityAnalyticsScreenData = jest.fn();

jest.mock("@/lib/data/activity/useActivityAnalyticsScreenData", () => ({
  useActivityAnalyticsScreenData: () => mockUseActivityAnalyticsScreenData(),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import ActivityAnalyticsScreen from "../analytics";

describe("ActivityAnalyticsScreen", () => {
  beforeEach(() => {
    mockUseActivityAnalyticsScreenData.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      rollupStatus: "ready",
      model: buildActivityMonthlyStepsAnalyticsModel({
        rollupByDay: {},
        todayDayKey: "2026-05-02",
        baselineRollupByDay: {},
        overviewAnchorEndDay: "2026-05-01",
      }),
    });
  });

  it("renders scroll and 2026 Steps analytics card", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityAnalyticsScreen />);
    });
    tree.root.findByProps({ testID: "activity-analytics-scroll" });
    tree.root.findByProps({ testID: "activity-steps-analytics-card" });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("2026 Steps");
  });
});
