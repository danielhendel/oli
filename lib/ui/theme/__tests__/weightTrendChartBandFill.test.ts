/**
 * Weight trend classification bands: one solid Weight-card category color each.
 * No sheen overlay, no gradient, no multi-shade layering within a category.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightClassificationColor,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

const TONES = ["cool", "reference", "caution", "elevated"] as const;

describe("Weight trend single-color classification bands", () => {
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

  it("WeightTrendChart renders one solid fill per band with no sheen or gradient", () => {
    const chartSrc = fs.readFileSync(
      path.join(__dirname, "../../WeightTrendChart.tsx"),
      "utf8",
    );

    expect(chartSrc).toContain("resolveWeightClassificationColor");
    expect(chartSrc).not.toContain("resolveWeightClassificationSegmentVisual");
    expect(chartSrc).not.toContain("fillHighlight");
    expect(chartSrc).not.toContain("sheenLayerOpacity");
    expect(chartSrc).not.toContain("sheenHeightRatio");
    expect(chartSrc).not.toContain("WEIGHT_TREND_CHART_BAND_BASE_OPACITY");
    // Classification bands: one Rect + solid color — no sheen/second layer.
    expect(chartSrc).toMatch(
      /visibleBands\.map\(\(band\) => \(\s*<Rect[\s\S]*?fill=\{resolveWeightClassificationColor\(band\.tone\)\}/,
    );
    expect(chartSrc).not.toMatch(
      /visibleBands\.map[\s\S]{0,600}fillHighlight|visibleBands\.map[\s\S]{0,600}sheen|visibleBands\.map[\s\S]{0,600}fillOpacity/,
    );
    // Soft area fill only when bands absent — never under classification colors.
    expect(chartSrc).toContain("visibleBands.length === 0");
    // White core + blue halo preserved.
    expect(chartSrc).toContain('LINE_CORE_WHITE = "#FFFFFF"');
    expect(chartSrc).toContain("LINE_GLOW_BLUE");
    expect(chartSrc).toContain("LINE_WIDTH = 2.05");
    expect(chartSrc).toContain("weightTrendPlotClip");
    expect(chartSrc).toContain("resolveWeightTrendMonthMarkersForRange");
    expect(chartSrc).toContain("CROSSHAIR_GLOW");
    expect(chartSrc).toContain("guidePt");
  });
});
