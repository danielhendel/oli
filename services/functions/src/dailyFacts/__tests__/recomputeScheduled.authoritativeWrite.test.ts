import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("onDailyFactsRecomputeScheduled — authoritative writes", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("writes dailyFacts WITHOUT merge:true (prevents stale fields)", async () => {
    const setMock = jest.fn();
    const commitMock = jest.fn(async () => undefined);

    const batchMock = jest.fn(() => ({
      set: setMock,
      commit: commitMock,
    }));

    const eventsDocs = [
      {
        ref: { parent: { parent: { id: "user_123" } }, path: "users/user_123/events/e1" },
        data: () => ({
          day: "2025-01-01",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
      },
    ];

    const getEventsMock = jest.fn(async () => ({
      empty: false,
      docs: eventsDocs,
    }));

    const getHistoryMock = jest.fn(async () => ({
      docs: [],
    }));

    const docMock = jest.fn((userId: string) => ({
      id: userId,
      collection: jest.fn((name: string) => {
        if (name === "dailyFacts") {
          return {
            doc: jest.fn((dateId: string) => ({
              id: dateId,
              path: `users/${userId}/dailyFacts/${dateId}`,
            })),
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: getHistoryMock,
              })),
            })),
          };
        }
        return {
          doc: jest.fn((id: string) => ({
            id,
            path: `users/${userId}/${name}/${id}`,
          })),
        };
      }),
    }));

    const collectionMock = jest.fn((name: string) => {
      if (name === "users") return { doc: docMock };
      return { doc: jest.fn() };
    });

    const collectionGroupMock = jest.fn(() => ({
      where: jest.fn(() => ({
        get: getEventsMock,
      })),
    }));

    // ✅ Critical: avoid Firebase v2 scheduler wrapper in unit tests
    // Make onSchedule return the handler function directly.
    jest.doMock("firebase-functions/v2/scheduler", () => ({
      onSchedule: (_opts: unknown, handler: unknown) => handler,
    }));

    jest.doMock("../../pipeline/pipelineMeta", () => ({
      buildPipelineMeta: () => ({
        computedAt: "x",
        source: { eventsForDay: 1, latestCanonicalEventAt: "x" },
      }),
    }));

    jest.doMock("../../pipeline/pipelineLatency", () => ({
      computeLatencyMs: () => 0,
      shouldWarnLatency: () => false,
    }));

    jest.doMock("../aggregateDailyFacts", () => ({
      aggregateDailyFactsForDay: () => ({
        userId: "user_123",
        date: "2025-01-01",
        computedAt: "2025-01-02T03:00:00.000Z",
        schemaVersion: 1,
        activity: { steps: 1000 },
      }),
    }));

    jest.doMock("../enrichDailyFacts", () => ({
      enrichDailyFactsWithBaselinesAndAverages: (args: unknown) => {
        const a = args as { today: unknown };
        return a.today;
      },
    }));

    jest.doMock("../../firebaseAdmin", () => ({
      db: {
        batch: batchMock,
        collection: collectionMock,
        collectionGroup: collectionGroupMock,
      },
    }));

    // Require inside isolateModules so mocks apply
    const fnUnknown: unknown = await new Promise((resolve) => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require("../onDailyFactsRecomputeScheduled") as Record<string, unknown>;
        resolve(mod.onDailyFactsRecomputeScheduled);
      });
    });

    // Since onSchedule is identity-wrapped, export is now the handler async function
    if (typeof fnUnknown !== "function") {
      throw new Error("Expected onDailyFactsRecomputeScheduled to be a function in test");
    }

    await fnUnknown();

    // Assert: batch.set called WITHOUT merge:true
    expect(setMock).toHaveBeenCalled();

    for (const call of setMock.mock.calls) {
      const options = call[2] as unknown;
      if (options && typeof options === "object") {
        const merge = (options as { merge?: unknown }).merge;
        expect(merge).not.toBe(true);
      }
    }
  });
});
