/**
 * Presentation-only checks for Strength Analytics yearly workload bars (labels + baseline hairline).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import { StrengthYearlyWorkloadBars } from "@/lib/ui/workouts/StrengthYearlyWorkloadBars";

describe("StrengthYearlyWorkloadBars", () => {
  const base = {
    barTrackHeight: 120,
    fillColorGood: "#00AA00",
    maxScale: 10,
    baselineMonthlyAvg: 5,
    todayMonthKey: "2026-03",
  };

  it("renders baseline reference line test id", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyWorkloadBars
          {...base}
          points={[
            { monthKey: "2026-01", displayLabel: "J", value: 3 },
            { monthKey: "2026-02", displayLabel: "F", value: 0 },
          ]}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "strength-yearly-chart-baseline-line" })).toBeTruthy();
  });

  it("shows value labels only for past/current months with workouts > 0", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyWorkloadBars
          {...base}
          points={[
            { monthKey: "2026-01", displayLabel: "J", value: 4 },
            { monthKey: "2026-02", displayLabel: "F", value: 0 },
            { monthKey: "2026-03", displayLabel: "M", value: 0 },
            { monthKey: "2026-04", displayLabel: "A", value: 9 },
          ]}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"4"');
    expect(json).not.toContain('"9"');
    expect(json).not.toContain('"0"');
  });
});
