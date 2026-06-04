import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import { getDailyFacts } from "@/lib/api/usersMe";
import {
  __testing_resetDailyFactsSessionCache,
  getDailyFactsSessionCached,
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

describe("getDailyFactsSessionCached cacheBust", () => {
  it("drops settled cache and refetches when cacheBust is set", async () => {
    mockGetDailyFacts
      .mockResolvedValueOnce(ok("2026-05-31", 2) as never)
      .mockResolvedValueOnce(ok("2026-05-31", 1) as never);

    const base = { userUid: "u1", day: "2026-05-31", token: "tok" };
    const stale = await getDailyFactsSessionCached(base);
    expect(stale.ok && stale.json.strength?.workoutsCount).toBe(2);
    expect(mockGetDailyFacts).toHaveBeenCalledTimes(1);

    const fresh = await getDailyFactsSessionCached({
      ...base,
      opts: { cacheBust: "bust:2026-05-31" },
    });
    expect(fresh.ok && fresh.json.strength?.workoutsCount).toBe(1);
    expect(mockGetDailyFacts).toHaveBeenCalledTimes(2);
    expect(mockGetDailyFacts.mock.calls[1]?.[2]?.cacheBust).toBe("bust:2026-05-31");
  });
});
