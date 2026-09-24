import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";

describe("WeightTrendStatsPanel", () => {
  it("renders equal-width Change / High / Low cards without Average or period caption", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(WeightTrendStatsPanel, {
          rows: [
            {
              key: "change",
              label: "Change",
              value: "+2.2 lb",
              testID: "body-metric-trend-stat-change",
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
    expect(tree.root.findByProps({ testID: "body-metric-trend-stat-change" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-stat-high" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-stat-low" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-stat-average" })).toHaveLength(0);
    expect(
      tree.root.findByProps({ testID: "body-metric-trend-stat-change" }).props.accessibilityLabel,
    ).toBe("Change +2.2 lb");
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((x) => typeof x === "string")
      .join(" ");
    expect(text).not.toMatch(/30D|1Y change|All-time/i);
  });

  it("renders nothing when rows are empty", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(WeightTrendStatsPanel, { rows: [] }));
    });
    expect(tree.toJSON()).toBeNull();
  });
});
