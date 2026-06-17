import {
  invalidateDailyFactsSessionCache,
  scheduleDailyFactsInvalidationAfterIngest,
} from "@/lib/data/dailyFactsSessionCache";
import type { GetOptions } from "@/lib/api/http";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Refetch raw events + DailyFacts after a nutrition log mutation (delete/edit/log).
 * Busts session cache and schedules a deferred DailyFacts invalidation for eventual
 * server rollup catch-up.
 */
export function refreshNutritionDayAfterMutation(args: {
  userUid: string;
  dayKey: DayKey;
  refetchFacts: (opts?: TruthGetOptions) => void;
  refetchRaw: (opts?: GetOptions) => void;
}): void {
  const cacheBust = `nutrition-mutation:${Date.now()}`;
  invalidateDailyFactsSessionCache({ userUid: args.userUid, day: args.dayKey });
  scheduleDailyFactsInvalidationAfterIngest({ userUid: args.userUid, day: args.dayKey });
  args.refetchFacts({ cacheBust });
  args.refetchRaw({ cacheBust });
}
