/**
 * Weight classification colors remain owned by the Body Composition Weight card.
 * Weight detail trend chart uses a plain dark plot — no classification fills.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightClassificationColor,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

const TONES = ["cool", "reference", "caution", "elevated"] as const;

describe("Weight classification colors (Body Weight card)", () => {
  it("resolves one exact Weight-card solid color per classification tone", () => {
    for (const tone of TONES) {
      const color = resolveWeightClassificationColor(tone);
      const chrome = resolveBodyMetricClassificationBandChrome(tone);

      expect(color).toBe(chrome.fillStrong);
      expect(color).toBe(BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS[tone]);
      expect(color.startsWith("#")).toBe(true);
      expect(color).not.toMatch(/rgba?\(/i);
    }

    expect(resolveWeightClassificationColor("cool")).toBe("#3B82F6");
    expect(resolveWeightClassificationColor("reference")).toBe("#10B981");
    expect(resolveWeightClassificationColor("caution")).toBe("#F59E0B");
    expect(resolveWeightClassificationColor("elevated")).toBe("#EF4444");
  });
});

describe("WeightTrendChart dark plot (no classification fills)", () => {
  it("uses near-black plot background and does not paint classification bands", () => {
    const chartSrc = fs.readFileSync(
      path.join(__dirname, "../../WeightTrendChart.tsx"),
      "utf8",
    );
    const detailSrc = fs.readFileSync(
      path.join(__dirname, "../../body/BodyMetricTrendDetailView.tsx"),
      "utf8",
    );
    const metricSrc = fs.readFileSync(
      path.join(__dirname, "../../../../app/(app)/body/metric/[metric].tsx"),
      "utf8",
    );

    expect(chartSrc).toContain("PLOT_BG = UI_SCREEN_BG");
    expect(chartSrc).toContain("fill={PLOT_BG}");
    expect(chartSrc).not.toContain("resolveWeightClassificationColor");
    expect(chartSrc).not.toContain("visibleBands");
    expect(chartSrc).not.toContain("classificationBands");
    expect(chartSrc).not.toContain("clipWeightTrendBandToDomain");
    expect(chartSrc).toContain('LINE_CORE_WHITE = "#FFFFFF"');
    expect(chartSrc).toContain("LINE_GLOW_BLUE");
    expect(chartSrc).toContain("GRID_V_COLOR");
    expect(chartSrc).toContain("layoutAnchors");
    expect(chartSrc).toContain("guidePt");

    expect(detailSrc).not.toContain("classificationBands");
    expect(detailSrc).not.toMatch(/Weight ranges shown in the background/);
    expect(detailSrc).toContain("highContrastLine={props.valueKind === \"mass\"}");

    expect(metricSrc).not.toContain("buildWeightTrendClassificationBands");
    expect(metricSrc).not.toContain("classificationBands=");
  });
});
