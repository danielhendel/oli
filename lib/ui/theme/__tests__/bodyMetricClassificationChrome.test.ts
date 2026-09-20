import {
  BODY_METRIC_CLASSIFICATION_LABEL_TOKENS,
  BODY_METRIC_CLASSIFICATION_RANGE_TOKENS,
  resolveBodyMetricClassificationBandChrome,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";
import { UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

describe("bodyMetricClassificationChrome — proposal segment colors", () => {
  it("uses distinct bright segment hues for each Weight class (not generic white)", () => {
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.cool).toBe("#7DD3FC");
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.reference).toBe("#4ADE80");
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.caution).toBe("#FBBF24");
    expect(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS.elevated).toBe("#FB7185");
    const labels = Object.values(BODY_METRIC_CLASSIFICATION_LABEL_TOKENS);
    expect(new Set(labels).size).toBe(4);
    for (const hex of labels) {
      expect(hex).not.toBe("#FFFFFF");
      expect(hex).not.toBe("#F7F8FA");
      expect(hex).not.toBe(UI_TEXT_MUTED);
      expect(hex.startsWith("#")).toBe(true);
    }
  });

  it("uses coordinated readable range tokens distinct from muted tertiary", () => {
    for (const tone of ["cool", "reference", "caution", "elevated"] as const) {
      const chrome = resolveBodyMetricClassificationBandChrome(tone);
      expect(chrome.range).toBe(BODY_METRIC_CLASSIFICATION_RANGE_TOKENS[tone]);
      expect(chrome.range).not.toBe(UI_TEXT_MUTED);
      expect(chrome.label).not.toBe(chrome.range);
    }
  });
});
