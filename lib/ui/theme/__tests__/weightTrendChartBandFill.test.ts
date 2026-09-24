/**
 * Exact Weight-card ↔ Weight-trend visual parity.
 * Chart must consume the same segment visual object fields as the card —
 * no chart-specific palette, no fillStrong alpha transform.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BODY_METRIC_CLASSIFICATION_BAND_SHEEN_HEIGHT_RATIO,
  BODY_METRIC_CLASSIFICATION_BAND_SHEEN_OPACITY,
  BODY_METRIC_CLASSIFICATION_FILL_HIGHLIGHT_TOKENS,
  BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightClassificationBandPaint,
  resolveWeightClassificationSegmentVisual,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

const TONES = ["cool", "reference", "caution", "elevated"] as const;

describe("exact Weight classification visual parity", () => {
  it("shared segment visual uses exact Weight-card fillStrong / fillHighlight / sheen recipe", () => {
    for (const tone of TONES) {
      const chrome = resolveBodyMetricClassificationBandChrome(tone);
      const paint = resolveWeightClassificationBandPaint(tone);
      const visual = resolveWeightClassificationSegmentVisual(tone);

      expect(visual.paint).toEqual(paint);
      expect(visual.paint.fillStrong).toBe(chrome.fillStrong);
      expect(visual.paint.fillHighlight).toBe(chrome.fillHighlight);
      expect(visual.paint.divider).toBe(chrome.divider);
      expect(visual.paint.fillStrong).toBe(BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS[tone]);
      expect(visual.paint.fillHighlight).toBe(
        BODY_METRIC_CLASSIFICATION_FILL_HIGHLIGHT_TOKENS[tone],
      );

      // Solid card rail colors — no alpha channel on base fill.
      expect(visual.paint.fillStrong.startsWith("#")).toBe(true);
      expect(visual.paint.fillStrong).not.toMatch(/rgba?\(/i);

      // Sheen recipe matches card bandSheen exactly.
      expect(visual.sheenLayerOpacity).toBe(BODY_METRIC_CLASSIFICATION_BAND_SHEEN_OPACITY);
      expect(visual.sheenHeightRatio).toBe(BODY_METRIC_CLASSIFICATION_BAND_SHEEN_HEIGHT_RATIO);
      expect(visual.sheenLayerOpacity).toBe(0.85);
      expect(visual.sheenHeightRatio).toBe(0.48);
    }
  });

  it("does not define a trend-specific alternate palette for classification tones", () => {
    const underweight = resolveWeightClassificationSegmentVisual("cool");
    const healthy = resolveWeightClassificationSegmentVisual("reference");
    const overweight = resolveWeightClassificationSegmentVisual("caution");
    const obesity = resolveWeightClassificationSegmentVisual("elevated");

    // Exact Weight-card rail hexes (BodyMetricClassificationChart backgroundColor).
    expect(underweight.paint.fillStrong).toBe("#3B82F6");
    expect(healthy.paint.fillStrong).toBe("#10B981");
    expect(overweight.paint.fillStrong).toBe("#F59E0B");
    expect(obesity.paint.fillStrong).toBe("#EF4444");
  });

  it("WeightTrendChart and BodyMetricClassificationChart share the segment visual resolver", () => {
    const chartSrc = fs.readFileSync(
      path.join(__dirname, "../../WeightTrendChart.tsx"),
      "utf8",
    );
    const cardSrc = fs.readFileSync(
      path.join(__dirname, "../../body/BodyMetricClassificationChart.tsx"),
      "utf8",
    );

    expect(chartSrc).toContain("resolveWeightClassificationSegmentVisual");
    expect(cardSrc).toContain("resolveWeightClassificationSegmentVisual");
    // No chart-local opacity transform on the base fillStrong rect.
    expect(chartSrc).not.toMatch(/fill=\{visual\.paint\.fillStrong\}[\s\S]{0,80}fillOpacity=/);
    expect(chartSrc).not.toMatch(/WEIGHT_TREND_CHART_BAND_BASE_OPACITY/);
    expect(chartSrc).not.toMatch(/mixWithBackground|desaturate|darken\(/);
    // White core + blue halo preserved over bright bands.
    expect(chartSrc).toContain('LINE_CORE_WHITE = "#FFFFFF"');
    expect(chartSrc).toContain("LINE_GLOW_BLUE");
  });
});
