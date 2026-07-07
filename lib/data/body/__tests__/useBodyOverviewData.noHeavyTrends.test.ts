import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "@jest/globals";

describe("useBodyOverviewData", () => {
  it("does not stack extra useBodyMetricTrends hooks on the overview (baseline uses 5Y series only)", () => {
    const p = join(__dirname, "../useBodyOverviewData.ts");
    const src = readFileSync(p, "utf8");
    expect(src).not.toContain("useBodyMetricTrends");
    expect(src).not.toContain("BODY_METRIC_DETAIL_DEFAULT_RANGE");
  });

  it("after Apple Health body sync, refetches series, peek, snapshot-day peek, and daily facts", () => {
    const p = join(__dirname, "../useBodyOverviewData.ts");
    const src = readFileSync(p, "utf8");
    expect(src).toContain("useAppleHealthBodySync(");
    expect(src).toContain("seriesRef.current.refetch({ cacheBust:");
    expect(src).toContain("peekRef.current.refetch({ cacheBust:");
    expect(src).toContain("snapshotDayPeekRef.current.refetch({ cacheBust:");
    expect(src).toContain("dayFactsRef.current.refetch({ cacheBust:");
  });
});
