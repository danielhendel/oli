import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import { getDailyFacts } from "@/lib/api/usersMe";
import {
  __testing_resetDailyFactsSessionCache,
  getDailyFactsNetworkFresh,
  getDailyFactsSessionCached,
  invalidateDailyFactsSessionCache,
} from "@/lib/data/dailyFactsSessionCache";

jest.mock("@/lib/api/usersMe", () => ({
  getDailyFacts: jest.fn(),
}));

const mockGetDailyFacts = getDailyFacts as jest.MockedFunction<typeof getDailyFacts>;

function ok(day: string, workoutsCount: number) {
  return {
    ok: true as const,
    status: 200,
    requestId: `req-${day}`,
    json: {
      userId: "u1",
      date: day,
      strength: { workoutsCount, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __testing_resetDailyFactsSessionCache();
});

describe("dailyFactsSessionCache stale in-flight writes", () => {
  it("ignores a slow pre-invalidation response so a network-fresh read wins", async () => {
    let resolveStale: (v: ReturnType<typeof ok>) => void = () => undefined;
    const stalePromise = new Promise<ReturnType<typeof ok>>((resolve) => {
      resolveStale = resolve;
    });

    mockGetDailyFacts
      .mockReturnValueOnce(stalePromise as never)
      .mockResolvedValueOnce(ok("2026-05-31", 1) as never);

    const base = { userUid: "u1", day: "2026-05-31", token: "tok" };
    const inflight = getDailyFactsSessionCached(base);
    invalidateDailyFactsSessionCache({ userUid: "u1", day: "2026-05-31", notify: false });

    const fresh = await getDailyFactsNetworkFresh({
      ...base,
      cacheBust: "weeklyFitness:2026-05-31",
    });
    expect(fresh.ok && fresh.json.strength?.workoutsCount).toBe(1);

    resolveStale(ok("2026-05-31", 2));
    await inflight;

    const after = await getDailyFactsSessionCached(base);
    expect(after.ok && after.json.strength?.workoutsCount).toBe(1);
    expect(mockGetDailyFacts).toHaveBeenCalledTimes(2);
  });
});
