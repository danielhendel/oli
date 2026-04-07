import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "@jest/globals";

describe("useBodyOverviewData", () => {
  it("uses a single bounded YTD weight trend hook with anchorDayKey (no stacked 1Y/6M/90D/30D hooks)", () => {
    const p = join(__dirname, "../useBodyOverviewData.ts");
    const src = readFileSync(p, "utf8");
    expect(src).toContain('useBodyMetricTrends("YTD", "weight", { anchorDayKey: factsDay })');
    expect(src).not.toContain('useBodyMetricTrends("6M"');
    expect(src).not.toContain('useBodyMetricTrends("90D"');
    expect(src).not.toContain('useBodyMetricTrends("30D"');
    expect(src).not.toContain("BODY_METRIC_DETAIL_DEFAULT_RANGE");
  });

  it("after Apple Health body sync, refetches series, peek, snapshot-day peek, daily facts, and YTD weight trend hook", () => {
    const p = join(__dirname, "../useBodyOverviewData.ts");
    const src = readFileSync(p, "utf8");
    expect(src).toContain("useAppleHealthBodySync(");
    expect(src).toContain("void series.refetch({ cacheBust:");
    expect(src).toContain("void peek.refetch({ cacheBust:");
    expect(src).toContain("void snapshotDayPeek.refetch({ cacheBust:");
    expect(src).toContain("void dayFacts.refetch({ cacheBust:");
    expect(src).toContain("void trendsWeightYtd.refetch({ cacheBust:");
  });
});
