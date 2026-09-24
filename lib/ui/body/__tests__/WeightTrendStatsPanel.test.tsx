import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";

describe("WeightTrendStatsPanel", () => {
  it("renders Low / High / Change in that order without Average", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(WeightTrendStatsPanel, {
          rows: [
            {
              key: "low",
              label: "Low",
              value: "156.1 lb",
              testID: "body-metric-trend-stat-low",
            },
            {
              key: "high",
              label: "High",
              value: "166.5 lb",
              testID: "body-metric-trend-stat-high",
            },
            {
              key: "change",
              label: "Change",
              value: "+7.8 lb",
              testID: "body-metric-trend-stat-change",
            },
          ],
        }),
      );
    });
    const panel = tree.root.findByProps({ testID: "body-metric-trend-summary" });
    const cards = panel.children.filter(
      (c): c is renderer.ReactTestInstance =>
        typeof c !== "string" && c.props?.testID != null,
    );
    expect(cards.map((c) => c.props.testID)).toEqual([
      "body-metric-trend-stat-low",
      "body-metric-trend-stat-high",
      "body-metric-trend-stat-change",
    ]);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-stat-average" })).toHaveLength(0);
  });

  it("renders nothing when rows are empty", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(WeightTrendStatsPanel, { rows: [] }));
    });
    expect(tree.toJSON()).toBeNull();
  });
});
