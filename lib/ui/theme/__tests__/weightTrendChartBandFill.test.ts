import {
  BODY_METRIC_CLASSIFICATION_LABEL_TOKENS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightTrendChartBandFill,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

describe("resolveWeightTrendChartBandFill", () => {
  it("derives translucent fills from Weight-card fillStrong tones", () => {
    for (const tone of ["cool", "reference", "caution", "elevated"] as const) {
      const fill = resolveWeightTrendChartBandFill(tone);
      const strong = resolveBodyMetricClassificationBandChrome(tone).fillStrong;
      expect(strong.startsWith("#")).toBe(true);
      expect(fill.startsWith("rgba(")).toBe(true);
      expect(fill).toMatch(/0\.14\)$/);
    }
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.cool).toBeTruthy();
  });
});
