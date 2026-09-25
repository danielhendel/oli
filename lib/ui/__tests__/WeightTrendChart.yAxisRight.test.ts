import * as fs from "fs";
import * as path from "path";

import { WEIGHT_TREND_CHART_PADDING } from "@/lib/ui/WeightTrendChart";

describe("WeightTrendChart Y-axis placement", () => {
  it("exports right-heavy padding and configures labels on the right", () => {
    expect(WEIGHT_TREND_CHART_PADDING.right).toBeGreaterThan(WEIGHT_TREND_CHART_PADDING.left);
    expect(WEIGHT_TREND_CHART_PADDING.left + WEIGHT_TREND_CHART_PADDING.right).toBe(50);

    const src = fs.readFileSync(
      path.join(__dirname, "../WeightTrendChart.tsx"),
      "utf8",
    );
    expect(src).toContain('textAnchor="end"');
    expect(src).toContain("Y-axis tick labels — RIGHT of plot");
    expect(src).not.toMatch(/Y-axis tick labels — left of plot/);
    expect(src).toContain("yLabelX");
  });
});
