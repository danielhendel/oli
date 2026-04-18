import React from "react";
import renderer, { act } from "react-test-renderer";

import { ActivityOverviewCard } from "@/lib/ui/activity/ActivityOverviewCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("ActivityOverviewCard", () => {
  it("shows loading without bars when loading", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ActivityOverviewCard loading error={null} model={null} />);
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Loading steps");
    expect(str).not.toContain("activity-overview-steps-bar-day7");
  });

  it("shows error inline together with model when both are set", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityOverviewCard
          loading={false}
          error={{ message: "partial failure", requestId: "r9", onRetry: jest.fn() }}
          model={{
            timeframes: [
              {
                key: "day7",
                label: "7 Day",
                compactStatsSummary: "100/day",
                markerPosition01: 0.1,
              },
            ],
          }}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("partial failure");
    expect(str).toContain("100");
    expect(str).toContain("activity-overview-steps-bar-day7");
  });

  it("shows error inline when error is set and model is null", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityOverviewCard
          loading={false}
          error={{ message: "failed", requestId: "r1", onRetry: jest.fn() }}
          model={null}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("failed");
  });

  it("renders segmented bars only when model is present", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityOverviewCard
          loading={false}
          error={null}
          model={{
            timeframes: [
              {
                key: "day7",
                label: "7 Day",
                compactStatsSummary: "100/day",
                markerPosition01: 0.1,
              },
            ],
          }}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("100");
    expect(str).toContain("activity-overview-steps-bar-day7");
    expect(str).toContain("Low");
    expect(str).not.toContain("Optimal");
    expect(str).not.toContain("Overview");
  });

  it("renders Not enough data copy when model supplies it", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityOverviewCard
          loading={false}
          error={null}
          model={{
            timeframes: [
              {
                key: "ytd",
                label: "YTD",
                compactStatsSummary: "Not enough data",
                markerPosition01: 0,
              },
            ],
          }}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Not enough data");
  });
});
