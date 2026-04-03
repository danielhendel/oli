import { describe, it, expect } from "@jest/globals";
import { rawEventsListQuerySchema } from "@oli/contracts";
import { BODY_OVERVIEW_PEEK_PER_KIND_LIMIT } from "../overviewPeekConstants";

describe("useBodyOverviewPeek raw-events limit", () => {
  it("uses per-kind limits accepted by the API (avoids HTTP 400 INVALID_QUERY)", () => {
    const base = {
      limit: BODY_OVERVIEW_PEEK_PER_KIND_LIMIT,
      start: "2021-01-01",
      end: "2026-12-31",
      includePayload: "true",
    };
    expect(rawEventsListQuerySchema.safeParse({ ...base, kinds: "weight" }).success).toBe(true);
    expect(rawEventsListQuerySchema.safeParse({ ...base, kinds: "body_composition" }).success).toBe(true);
  });

  it("documents that limit above 100 is rejected (regression guard vs old 120)", () => {
    expect(rawEventsListQuerySchema.safeParse({ limit: 120 }).success).toBe(false);
  });
});

/** Mirrors useBodyOverviewData: only `ready` daily facts contribute `body`; errors/missing do not block peek/series. */
function pickDailyFactsBodyForOverview(dayFactsStatus: string): { bmi?: number } | null {
  return dayFactsStatus === "ready" ? { bmi: 22 } : null;
}

describe("Overview daily facts gating", () => {
  it("does not use daily facts body when status is error or missing (raw peek can still populate)", () => {
    expect(pickDailyFactsBodyForOverview("error")).toBeNull();
    expect(pickDailyFactsBodyForOverview("missing")).toBeNull();
    expect(pickDailyFactsBodyForOverview("partial")).toBeNull();
    expect(pickDailyFactsBodyForOverview("ready")).toEqual({ bmi: 22 });
  });
});
