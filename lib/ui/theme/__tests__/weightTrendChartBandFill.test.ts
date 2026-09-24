import {
  BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS,
  BODY_METRIC_CLASSIFICATION_LABEL_TOKENS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightTrendChartBandFill,
  resolveWeightTrendChartBandHighlight,
  WEIGHT_TREND_CHART_BAND_FILL_ALPHA,
  WEIGHT_TREND_CHART_BAND_HIGHLIGHT_ALPHA,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

describe("resolveWeightTrendChartBandFill", () => {
  it("derives brighter translucent fills from Weight-card fillStrong tones", () => {
    for (const tone of ["cool", "reference", "caution", "elevated"] as const) {
      const fill = resolveWeightTrendChartBandFill(tone);
      const highlight = resolveWeightTrendChartBandHighlight(tone);
      const strong = resolveBodyMetricClassificationBandChrome(tone).fillStrong;
      expect(strong).toBe(BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS[tone]);
      expect(fill.startsWith("rgba(")).toBe(true);
      expect(highlight.startsWith("rgba(")).toBe(true);
      expect(fill).toMatch(new RegExp(`${WEIGHT_TREND_CHART_BAND_FILL_ALPHA}\\)$`));
      expect(highlight).toMatch(
        new RegExp(`${WEIGHT_TREND_CHART_BAND_HIGHLIGHT_ALPHA}\\)$`),
      );
    }
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.cool).toBeTruthy();
    expect(WEIGHT_TREND_CHART_BAND_FILL_ALPHA).toBeGreaterThanOrEqual(0.2);
    expect(WEIGHT_TREND_CHART_BAND_FILL_ALPHA).toBeLessThanOrEqual(0.3);
  });
});
