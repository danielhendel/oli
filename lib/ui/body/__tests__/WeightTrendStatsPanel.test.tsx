import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";

describe("WeightTrendStatsPanel", () => {
  it("renders full-width Average/High/Low rows without Change", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(WeightTrendStatsPanel, {
          rows: [
            {
              key: "average",
              label: "Average",
              value: "164.0 lb",
              testID: "body-metric-trend-stat-average",
            },
            {
              key: "high",
              label: "High",
              value: "166.5 lb",
              testID: "body-metric-trend-stat-high",
            },
            {
              key: "low",
              label: "Low",
              value: "162.1 lb",
              testID: "body-metric-trend-stat-low",
            },
          ],
        }),
      );
    });
    expect(tree.root.findByProps({ testID: "body-metric-trend-summary" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-stat-change" })).toHaveLength(0);
    expect(
      tree.root.findByProps({ testID: "body-metric-trend-stat-average" }).props.accessibilityLabel,
    ).toBe("Average 164.0 lb");
    expect(
      tree.root.findByProps({ testID: "body-metric-trend-stat-high" }).props.accessibilityLabel,
    ).toBe("High 166.5 lb");
    expect(
      tree.root.findByProps({ testID: "body-metric-trend-stat-low" }).props.accessibilityLabel,
    ).toBe("Low 162.1 lb");
  });

  it("renders nothing when rows are empty", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(WeightTrendStatsPanel, { rows: [] }));
    });
    expect(tree.toJSON()).toBeNull();
  });
});
