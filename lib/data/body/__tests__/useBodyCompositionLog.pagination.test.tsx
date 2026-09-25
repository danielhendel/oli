/**
 * Weight History list must paginate every page (not stop at 100) and reach older dates.
 */
import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { getRawEvents } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBodyCompositionLog } from "@/lib/data/body/useBodyCompositionLog";

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/data/body/deviceTimeZone", () => ({
  getDeviceTimeZone: () => "America/New_York",
}));

const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

let lastEntries: { dayKey: string; observedAt: string }[] = [];
let lastStatus = "partial";

function LogHarness() {
  const log = useBodyCompositionLog("weight");
  lastEntries = log.entries.map((e) => ({ dayKey: e.dayKey, observedAt: e.observedAt }));
  lastStatus = log.status;
  return null;
}

function makeItem(id: string, observedAt: string) {
  return {
    id,
    kind: "weight" as const,
    observedAt,
    sourceId: "apple_health",
    userId: "u1",
    receivedAt: observedAt,
    schemaVersion: 1,
    payload: { weightKg: 71, time: observedAt, timezone: "America/New_York" },
  };
}

describe("useBodyCompositionLog pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastEntries = [];
    lastStatus = "partial";
    mockUseAuth.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("follows nextCursor across three pages (237 events) without start/end for Weight", async () => {
    let page = 0;
    mockGetRawEvents.mockImplementation(async () => {
      page += 1;
      if (page === 1) {
        return {
          ok: true,
          status: 200,
          requestId: "r1",
          json: {
            items: Array.from({ length: 100 }, (_, i) =>
              makeItem(`p1-${i}`, "2025-12-01T12:00:00.000Z"),
            ),
            nextCursor: "c2",
          },
        };
      }
      if (page === 2) {
        return {
          ok: true,
          status: 200,
          requestId: "r2",
          json: {
            items: Array.from({ length: 100 }, (_, i) =>
              makeItem(`p2-${i}`, "2024-06-01T12:00:00.000Z"),
            ),
            nextCursor: "c3",
          },
        };
      }
      return {
        ok: true,
        status: 200,
        requestId: "r3",
        json: {
          items: Array.from({ length: 37 }, (_, i) =>
            makeItem(
              `p3-${i}`,
              i === 36 ? "2023-05-10T12:00:00.000Z" : "2023-08-01T12:00:00.000Z",
            ),
          ),
          nextCursor: null,
        },
      };
    });

    await act(async () => {
      renderer.create(React.createElement(LogHarness));
    });
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(mockGetRawEvents).toHaveBeenCalledTimes(3);
    expect(mockGetRawEvents.mock.calls[0]![1]).toMatchObject({
      limit: 100,
      kinds: ["weight"],
      includePayload: true,
    });
    expect(mockGetRawEvents.mock.calls[0]![1]).not.toHaveProperty("start");
    expect(mockGetRawEvents.mock.calls[0]![1]).not.toHaveProperty("end");
    expect(mockGetRawEvents.mock.calls[1]![1]).toMatchObject({ cursor: "c2" });
    expect(mockGetRawEvents.mock.calls[2]![1]).toMatchObject({ cursor: "c3" });

    expect(lastStatus).toBe("ready");
    expect(lastEntries).toHaveLength(237);
    const oldest = lastEntries.reduce((a, b) =>
      Date.parse(a.observedAt) <= Date.parse(b.observedAt) ? a : b,
    );
    expect(oldest.dayKey).toBe("2023-05-10");
    expect(Date.parse(oldest.observedAt)).toBeLessThan(Date.parse("2025-11-04T00:00:00.000Z"));
  });
});
