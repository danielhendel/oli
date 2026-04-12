import type { ApiResult } from "@/lib/api/http";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import type { DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

/** Maps one GET /users/me/daily-facts result to a rollup cell (shared by multi-day hooks). */
export function interpretDailyFactsStepsRollupEntry(res: ApiResult<DailyFactsDto>): DayStepsRollupEntry {
  const outcome = truthOutcomeFromApiResult(res);
  if (outcome.status === "ready") {
    const s = outcome.data.activity?.steps;
    if (typeof s === "number" && Number.isFinite(s) && s >= 0) {
      return { kind: "numeric", steps: Math.round(s) };
    }
    return { kind: "absent" };
  }
  if (outcome.status === "missing") return { kind: "absent" };
  return { kind: "error", message: outcome.error, requestId: outcome.requestId };
}
