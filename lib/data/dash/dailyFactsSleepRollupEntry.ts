import type { ApiResult } from "@/lib/api/http";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { pickSleepMinutesFromFacts } from "@/lib/data/sleep/pickSleepMinutesFromFacts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

export type DaySleepRollupEntry =
  | { kind: "numeric"; minutes: number }
  | { kind: "absent" }
  | { kind: "error"; message: string; requestId?: string | null };

/** Maps one GET /users/me/daily-facts result to a sleep duration rollup cell. */
export function interpretDailyFactsSleepRollupEntry(res: ApiResult<DailyFactsDto>): DaySleepRollupEntry {
  const outcome = truthOutcomeFromApiResult(res);
  if (outcome.status === "ready") {
    const minutes = pickSleepMinutesFromFacts(outcome.data.sleep);
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) {
      return { kind: "numeric", minutes: Math.round(minutes) };
    }
    return { kind: "absent" };
  }
  if (outcome.status === "missing") return { kind: "absent" };
  return { kind: "error", message: outcome.error, requestId: outcome.requestId };
}
