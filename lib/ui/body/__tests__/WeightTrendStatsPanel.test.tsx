import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";
import * as fs from "node:fs";
import * as path from "node:path";

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

    for (const card of cards) {
      expect(card.props.style.backgroundColor).toBe(UI_CARD_SURFACE);
      expect(card.props.style.borderColor).toBe(UI_CARD_ELEVATED_BORDER);
      expect(card.props.style.backgroundColor).not.toMatch(/#152048|navy|3A5BDB|5B8CFF/i);
    }
  });

  it("uses shared premium dark-gray surfaces — no blue/navy card fill", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../WeightTrendStatsPanel.tsx"),
      "utf8",
    );
    expect(src).toContain("UI_CARD_SURFACE");
    expect(src).toContain("UI_CARD_ELEVATED_BORDER");
    expect(src).toContain("backgroundColor: UI_CARD_SURFACE");
    expect(src).not.toContain("SYSTEM_ACCENT_NAVY_DEPTH");
    expect(src).not.toContain("91, 140, 255");
    expect(src).toContain("color: UI_TEXT_MUTED");
    expect(src).toContain("color: UI_TEXT_PRIMARY");
    expect(UI_TEXT_MUTED).toBeTruthy();
    expect(UI_TEXT_PRIMARY).toBeTruthy();
  });

  it("renders nothing when rows are empty", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(WeightTrendStatsPanel, { rows: [] }));
    });
    expect(tree.toJSON()).toBeNull();
  });
});
