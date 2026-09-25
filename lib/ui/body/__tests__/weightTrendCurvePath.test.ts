import {
  buildWeightTrendCurvePath,
  linearPathD,
  WEIGHT_TREND_CURVE_MODE,
} from "@/lib/ui/body/weightTrendCurvePath";
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";
import * as fs from "node:fs";
import * as path from "node:path";

describe("WEIGHT_TREND_CURVE_MODE", () => {
  it("uses linear (no-overshoot) segments for Weight detail", () => {
    expect(WEIGHT_TREND_CURVE_MODE).toBe("linear");
  });
});

describe("linearPathD", () => {
  it("returns empty for fewer than two points", () => {
    expect(linearPathD([])).toBe("");
    expect(linearPathD([{ x: 0, y: 0 }])).toBe("");
  });

  it("connects observations with straight L segments only", () => {
    const d = linearPathD([
      { x: 0, y: 10 },
      { x: 10, y: 30 },
      { x: 20, y: 5 },
    ]);
    expect(d).toBe("M 0 10 L 10 30 L 20 5");
    expect(d).not.toMatch(/\bC\b/);
    expect(d).not.toMatch(/\bS\b/);
    expect(d).not.toMatch(/\bQ\b/);
  });

  it("does not invent peaks above or troughs below observations", () => {
    // Volatile zig-zag that monotone cubics still curve through.
    const pts = [
      { x: 0, y: 20 },
      { x: 10, y: 5 },
      { x: 20, y: 25 },
      { x: 30, y: 8 },
    ];
    const d = buildWeightTrendCurvePath(pts, "linear");
    expect(d).toBe("M 0 20 L 10 5 L 20 25 L 30 8");
    // Path only visits exact observation coordinates.
    for (const p of pts) {
      expect(d).toContain(`${p.x} ${p.y}`);
    }
  });
});

describe("buildWeightTrendCurvePath", () => {
  it("shares one geometry for the approved mode (core and halo use the same d)", () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 15 },
    ];
    const a = buildWeightTrendCurvePath(pts, WEIGHT_TREND_CURVE_MODE);
    const b = buildWeightTrendCurvePath(pts, WEIGHT_TREND_CURVE_MODE);
    expect(a).toBe(b);
    expect(a).toBe(linearPathD(pts));
    expect(a).not.toBe(monotonePathD(pts));
  });
});

describe("WeightTrendChart curve wiring", () => {
  it("builds one shared linear path for core and halo — no local cubic spline", () => {
    const chartSrc = fs.readFileSync(
      path.join(__dirname, "../../WeightTrendChart.tsx"),
      "utf8",
    );
    expect(chartSrc).toContain("buildWeightTrendCurvePath");
    expect(chartSrc).toContain("WEIGHT_TREND_CURVE_MODE");
    expect(chartSrc).toContain("One shared path for core + halo");
    expect(chartSrc).not.toContain("function monotonePathD");
    expect(chartSrc).not.toMatch(/curveMonotone|Catmull|catmull/i);
    // Halo and core both consume the same pathD binding.
    const haloStroke = chartSrc.indexOf("stroke={lineHalo}");
    const coreStroke = chartSrc.indexOf("stroke={lineStroke}");
    expect(haloStroke).toBeGreaterThan(0);
    expect(coreStroke).toBeGreaterThan(haloStroke);
    expect(chartSrc).toMatch(/d=\{pathD\}[\s\S]*d=\{pathD\}/);
  });
});
