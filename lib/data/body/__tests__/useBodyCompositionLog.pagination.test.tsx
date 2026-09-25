/**
 * Weight History list must paginate beyond the first raw-events page.
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

jest.mock("@/lib/data/body/bodyHistoryRange", () => ({
  resolveBodyHistoryQueryWindow: () => ({
    start: "2021-09-21",
    end: "2026-09-22",
  }),
}));

jest.mock("@/lib/data/body/bodyCompositionLogEntries", () => ({
  buildBodyCompositionLogEntries: (items: { id: string }[]) =>
    items.map((it) => ({
      rawEventId: it.id,
      observedAt: "2025-11-04T12:00:00.000Z",
      dayKey: "2025-11-04",
      weightKg: 70,
      bodyFatPercent: null,
      leanBodyMassKg: null,
      provider: "apple_health",
      isImported: true,
      canEdit: false,
      canDelete: true,
      deleteMenuLabel: "Delete",
      editDisabledReason: null,
      deleteDisabledReason: null,
    })),
  filterBodyCompositionLogEntriesForMetric: (entries: unknown[]) => entries,
}));

const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

let lastEntriesLen = 0;
let lastStatus = "partial";

function LogHarness() {
  const log = useBodyCompositionLog("weight");
  lastEntriesLen = log.entries.length;
  lastStatus = log.status;
  return null;
}

function makeItem(id: string) {
  return {
    id,
    kind: "weight" as const,
    observedAt: "2025-12-01T12:00:00.000Z",
    sourceId: "apple_health",
    userId: "u1",
    receivedAt: "2025-12-01T12:00:00.000Z",
    schemaVersion: 1,
    payload: { weightKg: 71 },
  };
}

describe("useBodyCompositionLog pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastEntriesLen = 0;
    lastStatus = "partial";
    mockUseAuth.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    } as unknown as ReturnType<typeof useAuth>);

    let page = 0;
    mockGetRawEvents.mockImplementation(async () => {
      page += 1;
      if (page === 1) {
        return {
          ok: true,
          status: 200,
          requestId: "r1",
          json: {
            items: Array.from({ length: 100 }, (_, i) => makeItem(`a-${i}`)),
            nextCursor: "cursor-2",
          },
        };
      }
      return {
        ok: true,
        status: 200,
        requestId: "r2",
        json: {
          items: Array.from({ length: 40 }, (_, i) => makeItem(`b-${i}`)),
          nextCursor: null,
        },
      };
    });
  });

  it("follows nextCursor until all pages are loaded", async () => {
    await act(async () => {
      renderer.create(React.createElement(LogHarness));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetRawEvents.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockGetRawEvents.mock.calls[0]![1]).toMatchObject({ limit: 100 });
    expect(mockGetRawEvents.mock.calls[1]![1]).toMatchObject({
      limit: 100,
      cursor: "cursor-2",
    });
    expect(lastStatus).toBe("ready");
    expect(lastEntriesLen).toBe(140);
  });
});
