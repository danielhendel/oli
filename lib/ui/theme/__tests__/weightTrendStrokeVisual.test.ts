/**
 * Weight detail stroke visual contract — crisp blue core, single halo, thin light-blue guide.
 */
import { SYSTEM_ACCENT_LUMINOUS } from "@/lib/ui/theme/systemAccent";
import {
  WEIGHT_TREND_STROKE_VISUAL,
  type WeightTrendStrokeVisual,
} from "@/lib/ui/theme/weightTrendStrokeVisual";
import * as fs from "node:fs";
import * as path from "node:path";

describe("WEIGHT_TREND_STROKE_VISUAL", () => {
  it("uses approved bright-blue core with a single low-opacity halo and thin light-blue guide", () => {
    const v: WeightTrendStrokeVisual = WEIGHT_TREND_STROKE_VISUAL;

    expect(v.coreColor).toBe(SYSTEM_ACCENT_LUMINOUS);
    expect(v.coreColor).toBe("#5B8CFF");
    expect(v.coreWidth).toBeGreaterThanOrEqual(2);
    expect(v.coreWidth).toBeLessThanOrEqual(2.5);

    expect(v.haloColor).toBe("rgba(91, 140, 255, 0.20)");
    expect(v.haloWidth).toBeGreaterThan(v.coreWidth);
    expect(v.haloWidth).toBeLessThanOrEqual(5);
    expect(v.haloWidth).toBeGreaterThanOrEqual(4);

    expect(v.activeGuideColor).toBe("rgba(168, 196, 255, 0.82)");
    expect(v.activeGuideWidth).toBeGreaterThanOrEqual(1);
    expect(v.activeGuideWidth).toBeLessThanOrEqual(1.5);
    expect(v.activeGuideWidth).toBeLessThan(v.coreWidth);
  });
});

describe("WeightTrendChart stroke rendering (crisp blue + light guide)", () => {
  it("paints one core, one halo, and a thin light-blue guide — no stacked glow or white primary", () => {
    const chartSrc = fs.readFileSync(
      path.join(__dirname, "../../WeightTrendChart.tsx"),
      "utf8",
    );

    expect(chartSrc).toContain("WEIGHT_TREND_STROKE_VISUAL");
    expect(chartSrc).toContain("LINE_CORE_BLUE = WEIGHT_TREND_STROKE_VISUAL.coreColor");
    expect(chartSrc).toContain("LINE_HALO_BLUE = WEIGHT_TREND_STROKE_VISUAL.haloColor");
    expect(chartSrc).toContain("ACTIVE_GUIDE_COLOR = WEIGHT_TREND_STROKE_VISUAL.activeGuideColor");
    expect(chartSrc).not.toContain("LINE_CORE_WHITE");
    expect(chartSrc).not.toContain("LINE_GLOW_SOFT");
    expect(chartSrc).not.toContain("LINE_GLOW_WIDTH");
    expect(chartSrc).not.toContain("LINE_SOFT_WIDTH");
    expect(chartSrc).not.toContain("CROSSHAIR_GLOW");
    expect(chartSrc).not.toContain("CROSSHAIR_COLOR");
    expect(chartSrc).not.toMatch(/feGaussianBlur|dropShadow|Filter\b/);
    expect(chartSrc).not.toContain("LINE_GLOW_WIDTH");
    expect(chartSrc).not.toContain("LINE_SOFT_WIDTH");

    // Exactly one halo Path + one core Path for the trend (no duplicate glow layer).
    const haloComment = chartSrc.includes("Single low-opacity blue halo");
    const coreComment = chartSrc.includes("Crisp opaque blue");
    expect(haloComment).toBe(true);
    expect(coreComment).toBe(true);

    // Guide before point in source order.
    const guideIdx = chartSrc.indexOf("Active vertical guide — thin light blue");
    const pointIdx = chartSrc.indexOf("Active / latest point marker");
    expect(guideIdx).toBeGreaterThan(0);
    expect(pointIdx).toBeGreaterThan(guideIdx);

    expect(chartSrc).toContain("GRID_V_COLOR");
    expect(chartSrc).toContain("GRID_V_DASH");
  });
});
