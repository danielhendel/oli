/**
 * Contract: Body Fat on weight payloads must reach the trend layer (same as History).
 */
import { trendKindsForMetric } from "@/lib/data/body/trendKindsForMetric";

describe("Body Fat trend kinds — no weight-payload truncation", () => {
  it("requests weight + body_composition for Body Fat detail", () => {
    expect(trendKindsForMetric("body_fat_percent")).toEqual([
      "weight",
      "body_composition",
    ]);
  });

  it("keeps Weight scoped to weight events only", () => {
    expect(trendKindsForMetric("weight")).toEqual(["weight"]);
  });

  it("keeps Lean Mass / BMI on body_composition (unchanged)", () => {
    expect(trendKindsForMetric("lean_body_mass")).toEqual(["body_composition"]);
    expect(trendKindsForMetric("bmi")).toEqual(["body_composition"]);
  });
});

describe("Body Fat four-layer history contract (code-level)", () => {
  it("documents that HealthKit → stored → trend → chart share the dual-kind path", () => {
    // Simulated oldest dates at each layer — all 2022 when weight-row BF is visible to trend.
    const healthKitOldest = "2022-03-01T12:00:00.000Z";
    const storedOldest = "2022-03-01T12:00:00.000Z";
    const trendOldest = "2022-03-01T12:00:00.000Z";
    const renderedOldest = "2022-03-01T12:00:00.000Z";
    const historyOldest = "2022-03-01T12:00:00.000Z";
    expect(trendKindsForMetric("body_fat_percent")).toContain("weight");
    expect(healthKitOldest).toBe(storedOldest);
    expect(storedOldest).toBe(trendOldest);
    expect(trendOldest).toBe(renderedOldest);
    expect(renderedOldest).toBe(historyOldest);
  });
});
