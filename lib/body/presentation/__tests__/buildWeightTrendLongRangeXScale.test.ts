/**
 * Long-range Body Fat / Weight X-scale: continuous timestamps for 3Y / 5Y / All.
 * Same-year observations must never collapse onto a single year-label slot.
 */
import {
  buildWeightTrendXScale,
  continuousNormalizedX,
  isWeightTrendLongRange,
  mapWeightTrendTimeToScreenX,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import { buildWeightTrendXAxisTicks } from "@/lib/body/presentation/buildWeightTrendXAxisTicks";

describe("long-range continuous X-scale", () => {
  it("All same-year Jul–Sep 2026 series keeps four distinct X positions", () => {
    const times = [
      Date.UTC(2026, 6, 28, 12, 0, 0), // Jul 28
      Date.UTC(2026, 7, 10, 12, 0, 0), // Aug 10
      Date.UTC(2026, 8, 1, 12, 0, 0), // Sep 1
      Date.UTC(2026, 8, 21, 12, 0, 0), // Sep 21
    ];
    const domainStartMs = times[0]!;
    const domainEndMs = times[times.length - 1]!;

    // Even with a single year layout anchor (the prior collapse bug), long-range
    // scales ignore anchors and use continuous time.
    const yearTicks = buildWeightTrendXAxisTicks({
      range: "All",
      scale: buildWeightTrendXScale({
        range: "All",
        domainStartMs,
        domainEndMs,
      }),
      plotWidthPx: 300,
    });
    expect(yearTicks.some((t) => t.label === "2026")).toBe(true);

    const scale = buildWeightTrendXScale({
      range: "All",
      domainStartMs,
      domainEndMs,
      layoutAnchors: yearTicks.map((t) => ({
        atMs: t.atMs,
        layoutNormalizedX: t.layoutNormalizedX,
      })),
    });

    const xs = times.map((t) => scale.toNormalizedX(t));
    expect(xs[0]).toBeCloseTo(0, 8);
    expect(xs[xs.length - 1]).toBeCloseTo(1, 8);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    }
    // Must not collapse to one vertical line at the year label.
    const unique = new Set(xs.map((x) => x.toFixed(6)));
    expect(unique.size).toBe(4);

    const plotLeft = 10;
    const plotWidth = 300;
    const screens = times.map((t) =>
      mapWeightTrendTimeToScreenX(t, scale, plotLeft, plotWidth),
    );
    expect(screens[0]).toBeCloseTo(plotLeft, 5);
    expect(screens[screens.length - 1]).toBeCloseTo(plotLeft + plotWidth, 5);
  });

  it("multi-year series keeps 2026 points distinct and year ticks on continuous time", () => {
    const times = [
      Date.UTC(2023, 5, 15, 12, 0, 0),
      Date.UTC(2024, 2, 10, 12, 0, 0),
      Date.UTC(2025, 8, 1, 12, 0, 0),
      Date.UTC(2026, 6, 28, 12, 0, 0),
      Date.UTC(2026, 8, 21, 12, 0, 0),
    ];
    const domainStartMs = times[0]!;
    const domainEndMs = times[times.length - 1]!;
    const scale = buildWeightTrendXScale({
      range: "5Y",
      domainStartMs,
      domainEndMs,
    });
    const xs = times.map((t) => scale.toNormalizedX(t));
    expect(xs[0]).toBeCloseTo(0, 8);
    expect(xs[xs.length - 1]).toBeCloseTo(1, 8);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    }
    // Two 2026 points must differ.
    expect(xs[4]! - xs[3]!).toBeGreaterThan(0.001);

    const ticks = buildWeightTrendXAxisTicks({
      range: "5Y",
      scale,
      plotWidthPx: 320,
    });
    for (const tick of ticks) {
      expect(tick.layoutNormalizedX).toBeCloseTo(
        continuousNormalizedX(tick.atMs, domainStartMs, domainEndMs),
        8,
      );
    }
  });

  it("marks 3Y / 5Y / All as long-range", () => {
    expect(isWeightTrendLongRange("All")).toBe(true);
    expect(isWeightTrendLongRange("5Y")).toBe(true);
    expect(isWeightTrendLongRange("3Y")).toBe(true);
    expect(isWeightTrendLongRange("6M")).toBe(false);
    expect(isWeightTrendLongRange("1Y")).toBe(false);
  });

  it("single-point All domain maps safely to mid-plot", () => {
    const t = Date.UTC(2026, 8, 21, 12, 0, 0);
    const scale = buildWeightTrendXScale({
      range: "All",
      domainStartMs: t,
      domainEndMs: t,
    });
    expect(scale.toNormalizedX(t)).toBeCloseTo(0.5, 8);
  });
});
