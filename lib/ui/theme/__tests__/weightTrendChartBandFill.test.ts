import {
  BODY_METRIC_CLASSIFICATION_FILL_HIGHLIGHT_TOKENS,
  BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS,
  BODY_METRIC_CLASSIFICATION_LABEL_TOKENS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightClassificationBandPaint,
  resolveWeightTrendChartBandFill,
  resolveWeightTrendChartBandHighlight,
  WEIGHT_TREND_CHART_BAND_BASE_OPACITY,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

describe("Weight trend chart band paint ↔ Weight card", () => {
  it("reuses exact Weight-card fillStrong + fillHighlight tokens", () => {
    for (const tone of ["cool", "reference", "caution", "elevated"] as const) {
      const chrome = resolveBodyMetricClassificationBandChrome(tone);
      const paint = resolveWeightClassificationBandPaint(tone);
      expect(paint.fillStrong).toBe(chrome.fillStrong);
      expect(paint.fillHighlight).toBe(chrome.fillHighlight);
      expect(paint.divider).toBe(chrome.divider);
      expect(paint.fillStrong).toBe(BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS[tone]);
      expect(paint.fillHighlight).toBe(BODY_METRIC_CLASSIFICATION_FILL_HIGHLIGHT_TOKENS[tone]);
    }
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.cool).toBeTruthy();
  });

  it("chart base fill keeps Weight-card fillStrong hue at chart opacity (no muddy darken gradient)", () => {
    expect(WEIGHT_TREND_CHART_BAND_BASE_OPACITY).toBeGreaterThanOrEqual(0.4);
    expect(WEIGHT_TREND_CHART_BAND_BASE_OPACITY).toBeLessThanOrEqual(0.55);
    for (const tone of ["cool", "reference", "caution", "elevated"] as const) {
      const paint = resolveWeightClassificationBandPaint(tone);
      const fill = resolveWeightTrendChartBandFill(tone);
      const sheen = resolveWeightTrendChartBandHighlight(tone);
      expect(sheen).toBe(paint.fillHighlight);
      expect(fill.startsWith("rgba(")).toBe(true);
      expect(fill).toMatch(new RegExp(`${WEIGHT_TREND_CHART_BAND_BASE_OPACITY}\\)$`));
      // Hex identity of fillStrong remains the card rail color.
      expect(paint.fillStrong.startsWith("#")).toBe(true);
    }
  });
});
