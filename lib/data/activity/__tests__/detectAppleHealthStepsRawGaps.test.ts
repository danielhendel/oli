import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  detectAppleHealthStepsRawGapsForRecentDays,
  enumerateRecentLocalDayKeysEndInclusive,
} from "@/lib/data/activity/detectAppleHealthStepsRawGaps";
import * as usersMe from "@/lib/api/usersMe";

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: jest.fn(),
}));

describe("enumerateRecentLocalDayKeysEndInclusive", () => {
  it("returns today first then prior days", () => {
    const keys = enumerateRecentLocalDayKeysEndInclusive("2026-04-08", 3);
    expect(keys).toEqual(["2026-04-08", "2026-04-07", "2026-04-06"]);
  });
});

describe("detectAppleHealthStepsRawGapsForRecentDays", () => {
  const getRawEvents = jest.mocked(usersMe.getRawEvents);

  beforeEach(() => {
    getRawEvents.mockReset();
  });

  it("returns empty when API fails", async () => {
    getRawEvents.mockResolvedValueOnce({ ok: false, status: 500, kind: "http", error: "x", requestId: null });
    const gaps = await detectAppleHealthStepsRawGapsForRecentDays("tok", "2026-04-08", 2);
    expect(gaps).toEqual([]);
  });

  it("flags days missing expected appleHealth:v2:steps doc ids", async () => {
    getRawEvents.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        items: [
          {
            id: "appleHealth:v2:steps:2026-04-08",
            userId: "u1",
            sourceId: "apple_health",
            kind: "steps" as const,
            observedAt: "2026-04-08T04:00:00.000Z",
            receivedAt: "2026-04-08T05:00:00.000Z",
            schemaVersion: 1 as const,
          },
        ],
        nextCursor: null,
      },
    });
    const gaps = await detectAppleHealthStepsRawGapsForRecentDays("tok", "2026-04-08", 2);
    expect(gaps).toEqual(["2026-04-07"]);
  });
});
