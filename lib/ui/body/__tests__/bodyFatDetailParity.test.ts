/**
 * Body Fat detail shares Weight's trend visual/interaction system; education stays off-page.
 */
import * as fs from "node:fs";
import * as path from "node:path";

describe("Body Fat detail parity with Weight", () => {
  const metricSrc = fs.readFileSync(
    path.join(__dirname, "../../../../app/(app)/body/metric/[metric].tsx"),
    "utf8",
  );
  const detailSrc = fs.readFileSync(
    path.join(__dirname, "../BodyMetricTrendDetailView.tsx"),
    "utf8",
  );
  const chartSrc = fs.readFileSync(
    path.join(__dirname, "../../WeightTrendChart.tsx"),
    "utf8",
  );

  it("reuses the same detail view, range selector, chart, and summary cards as Weight", () => {
    expect(metricSrc).toContain("BodyMetricTrendDetailView");
    expect(detailSrc).toContain("WeightRangeSelector");
    expect(detailSrc).toContain("WeightTrendChart");
    expect(detailSrc).toContain("WeightTrendStatsPanel");
    expect(detailSrc).toContain('key: "low"');
    expect(detailSrc).toContain('key: "high"');
    expect(detailSrc).toContain('key: "change"');
    expect(detailSrc).not.toContain('key: "average"');
  });

  it("enables Weight visual line/guide system for Body Fat percent", () => {
    expect(metricSrc).toContain('? "percent"');
    expect(detailSrc).toContain('props.valueKind === "percent"');
    expect(chartSrc).toContain("sharedPercentAxis");
    expect(chartSrc).toContain("WEIGHT_TREND_STROKE_VISUAL");
    expect(chartSrc).toContain("ACTIVE_GUIDE_COLOR");
    expect(chartSrc).toContain("WEIGHT_TREND_CURVE_MODE");
    expect(chartSrc).toContain("PLOT_BG = UI_SCREEN_BG");
  });

  it("locks a Body Fat-specific shared Y-domain and fetches All history", () => {
    expect(metricSrc).toContain("buildBodyFatDetailSharedDomain");
    expect(metricSrc).toContain("sharedPercentAxis");
    expect(metricSrc).toContain('metric === "body_fat_percent"');
    expect(metricSrc).toContain('? "All"');
  });

  it("does not mount educational detail content for Body Fat or Lean Mass", () => {
    expect(metricSrc).not.toContain("BodyMetricDetailEducationPanel");
    expect(metricSrc).not.toContain("BODY_FAT_EXTRA_LIMITATIONS");
    expect(metricSrc).not.toContain("LEAN_MASS_EXTRA_LIMITATIONS");
    expect(metricSrc).not.toContain("EDUCATIONAL REFERENCE");
    expect(metricSrc).toContain("BodyMetricDisplayModeToggle");
  });
});
