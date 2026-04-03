import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "@jest/globals";

describe("useBodyOverviewData", () => {
  it("does not reference useBodyMetricTrends (main Body avoids heavy trend pagination)", () => {
    const p = join(__dirname, "../useBodyOverviewData.ts");
    const src = readFileSync(p, "utf8");
    expect(src).not.toContain("useBodyMetricTrends");
  });

  it("after Apple Health body sync, refetches series, global peek, snapshot-day peek, and daily facts", () => {
    const p = join(__dirname, "../useBodyOverviewData.ts");
    const src = readFileSync(p, "utf8");
    expect(src).toContain("useAppleHealthBodySync(");
    expect(src).toContain("void series.refetch({ cacheBust:");
    expect(src).toContain("void peek.refetch({ cacheBust:");
    expect(src).toContain("void snapshotDayPeek.refetch({ cacheBust:");
    expect(src).toContain("void dayFacts.refetch({ cacheBust:");
  });
});
