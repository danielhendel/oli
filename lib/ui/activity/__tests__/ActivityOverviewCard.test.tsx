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
    expect(str).not.toContain("activity-overview-steps-bar-today");
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
                key: "today",
                label: "Today",
                compactStatsSummary: "100 steps",
                markerPosition01: 0.1,
              },
            ],
          }}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("partial failure");
    expect(str).toContain("activity-overview-steps-bar-today");
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
                key: "today",
                label: "Today",
                compactStatsSummary: "100 steps",
                markerPosition01: 0.1,
              },
            ],
          }}
        />,
      );
    });
    act(() => {
      tree.root
        .findAllByProps({ testID: "activity-overview-steps-bar-today" })
        .find((n) => typeof n.props.onLayout === "function")
        ?.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("activity-overview-steps-bar-today");
    expect(str).not.toContain("Low");
    expect(str).not.toContain("Optimal");
  });
});
