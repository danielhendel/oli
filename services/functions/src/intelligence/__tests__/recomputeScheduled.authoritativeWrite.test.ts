// services/functions/src/intelligence/__tests__/recomputeScheduled.authoritativeWrite.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

describe("onDailyIntelligenceContextRecomputeScheduled — authoritative writes", () => {
  beforeEach(() => {
    jest.resetModules();

    // ✅ Freeze time so "yesterday UTC" is deterministic in CI.
    // If "now" is 2026-01-15T12:00:00Z then yesterday UTC = 2026-01-14.
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("writes intelligenceContext WITHOUT merge:true (prevents stale fields)", async () => {
    const TARGET_DATE = "2026-01-14";

    const setMock = jest.fn();
    const commitMock = jest.fn(async () => undefined);

    const batchMock = jest.fn(() => ({
      set: setMock,
      commit: commitMock,
    }));

    const dailyFactsDocs = [
      {
        ref: {
          parent: { parent: { id: "user_123" } },
          path: `users/user_123/dailyFacts/${TARGET_DATE}`,
        },
        data: () => ({
          userId: "user_123",
          date: TARGET_DATE,
          computedAt: "2026-01-15T03:00:00.000Z",
          schemaVersion: 1,
        }),
      },
    ];

    const getDailyFactsMock = jest.fn(async () => ({
      empty: false,
      docs: dailyFactsDocs,
    }));

    const getInsightsMock = jest.fn(async () => ({
      docs: [],
    }));

    const getEventsMock = jest.fn(async () => ({
      docs: [
        {
          data: () => ({
            day: TARGET_DATE,
            createdAt: "2026-01-14T01:00:00.000Z",
            updatedAt: "2026-01-14T02:00:00.000Z",
          }),
        },
      ],
    }));

    const userDocMock = jest.fn(() => ({
      collection: jest.fn((name: string) => {
        if (name === "insights") {
          return { where: jest.fn(() => ({ get: getInsightsMock })) };
        }
        if (name === "events") {
          return { where: jest.fn(() => ({ get: getEventsMock })) };
        }
        if (name === "intelligenceContext") {
          return {
            doc: jest.fn((dateId: string) => ({
              id: dateId,
              path: `users/user_123/intelligenceContext/${dateId}`,
            })),
          };
        }
        return { doc: jest.fn() };
      }),
    }));

    const collectionMock = jest.fn((name: string) => {
      if (name === "users") return { doc: userDocMock };
      return { doc: jest.fn() };
    });

    const collectionGroupMock = jest.fn((name: string) => {
      if (name === "dailyFacts") {
        return { where: jest.fn(() => ({ get: getDailyFactsMock })) };
      }
      return { where: jest.fn(() => ({ get: getDailyFactsMock })) };
    });

    // Identity-wrap scheduler for unit tests
    jest.doMock("firebase-functions/v2/scheduler", () => ({
      onSchedule: (_opts: unknown, handler: unknown) => handler,
    }));

    jest.doMock("../buildDailyIntelligenceContext", () => ({
      buildDailyIntelligenceContext: () => ({
        schemaVersion: 1,
        version: "daily-intelligence-context-v1.0.0",
        id: TARGET_DATE,
        userId: "user_123",
        date: TARGET_DATE,
        computedAt: "2026-01-15T03:30:00.000Z",
        facts: {},
        insights: {
          count: 0,
          bySeverity: { info: 0, warning: 0, critical: 0 },
          tags: [],
          kinds: [],
          ids: [],
        },
        readiness: { hasDailyFacts: true, hasInsights: false, domainMeetsConfidence: {} },
      }),
    }));

    jest.doMock("../../pipeline/pipelineMeta", () => ({
      buildPipelineMeta: () => ({
        computedAt: "x",
        source: { eventsForDay: 1, insightsWritten: 0, latestCanonicalEventAt: "x" },
      }),
    }));

    jest.doMock("../../pipeline/pipelineLatency", () => ({
      computeLatencyMs: () => 0,
      shouldWarnLatency: () => false,
    }));

    jest.doMock("../../firebaseAdmin", () => ({
      db: {
        batch: batchMock,
        collection: collectionMock,
        collectionGroup: collectionGroupMock,
      },
    }));

    const fnUnknown: unknown = await new Promise((resolve) => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require("../onDailyIntelligenceContextRecomputeScheduled") as Record<string, unknown>;
        resolve(mod.onDailyIntelligenceContextRecomputeScheduled);
      });
    });

    if (typeof fnUnknown !== "function") {
      throw new Error("Expected onDailyIntelligenceContextRecomputeScheduled to be a function in test");
    }

    await fnUnknown();

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
