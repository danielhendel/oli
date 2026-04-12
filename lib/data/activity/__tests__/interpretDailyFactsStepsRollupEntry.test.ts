import type { ApiResult } from "@/lib/api/http";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { interpretDailyFactsStepsRollupEntry } from "@/lib/data/activity/dailyFactsStepsRollupEntry";

function okFacts(partial: Partial<DailyFactsDto>): ApiResult<DailyFactsDto> {
  const json = {
    schemaVersion: 1 as const,
    userId: "u",
    date: "2026-04-01",
    computedAt: "2026-04-01T12:00:00.000Z",
    ...partial,
  } as DailyFactsDto;
  return { ok: true, status: 200, requestId: "r1", json };
}

describe("interpretDailyFactsStepsRollupEntry", () => {
  it("returns numeric when activity.steps is present", () => {
    const r = okFacts({ activity: { steps: 8123 } });
    expect(interpretDailyFactsStepsRollupEntry(r)).toEqual({ kind: "numeric", steps: 8123 });
  });

  it("returns absent on 404", () => {
    const r: ApiResult<DailyFactsDto> = {
      ok: false,
      status: 404,
      kind: "http",
      error: "Not found",
      requestId: "r2",
      json: null,
    };
    expect(interpretDailyFactsStepsRollupEntry(r)).toEqual({ kind: "absent" });
  });

  it("returns error on HTTP failure (not silent absent)", () => {
    const r: ApiResult<DailyFactsDto> = {
      ok: false,
      status: 503,
      kind: "http",
      error: "Upstream unavailable",
      requestId: "r3",
      json: null,
    };
    expect(interpretDailyFactsStepsRollupEntry(r)).toEqual({
      kind: "error",
      message: "Upstream unavailable",
      requestId: "r3",
    });
  });
});
