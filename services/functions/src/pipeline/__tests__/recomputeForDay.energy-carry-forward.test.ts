import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Firestore } from "firebase-admin/firestore";

jest.mock("../../dailyFacts/loadBodyFactsFromRawForDay", () => ({
  loadBodyFactsFromRawForDay: jest.fn(async () => undefined),
}));
jest.mock("../../dailyFacts/aggregateDailyFacts", () => ({
  aggregateDailyFactsForDay: jest.fn((input: { userId: string; date: string; computedAt: string }) => ({
    schemaVersion: 1,
    userId: input.userId,
    date: input.date,
    computedAt: input.computedAt,
    activity: { steps: 6500 },
  })),
}));
jest.mock("../../dailyFacts/enrichDailyFacts", () => ({
  enrichDailyFactsWithBaselinesAndAverages: jest.fn((input: { today: unknown }) => input.today),
}));
jest.mock("../../insights/rules", () => ({
  generateInsightsForDailyFacts: jest.fn(() => []),
}));
jest.mock("../../intelligence/buildDailyIntelligenceContext", () => ({
  buildDailyIntelligenceContext: jest.fn((input: { userId: string; date: string; computedAt: string }) => ({
    schemaVersion: 1,
    version: "v1",
    id: input.date,
    userId: input.userId,
    date: input.date,
    computedAt: input.computedAt,
    facts: {},
    insights: { count: 0, tags: [], kinds: [], ids: [] },
    readiness: { hasDailyFacts: true, hasInsights: false },
  })),
}));
jest.mock("../../healthScore/computeHealthScoreV1", () => ({
  computeHealthScoreV1: jest.fn((input: { date: string }) => ({
    date: input.date,
    compositeScore: 50,
    domainScores: {
      recovery: { score: 50 },
      training: { score: 50 },
      nutrition: { score: 50 },
      body: { score: 50 },
    },
  })),
}));
jest.mock("../../healthSignals/computeHealthSignalsV1", () => ({
  computeHealthSignalsV1: jest.fn(() => ({ date: "2026-05-05" })),
}));
jest.mock("../../healthScore/writeHealthScoreImmutable", () => ({
  writeHealthScoreImmutable: jest.fn(async () => undefined),
}));
jest.mock("../../healthSignals/writeHealthSignalsImmutable", () => ({
  writeHealthSignalsImmutable: jest.fn(async () => undefined),
}));
jest.mock("../../pipeline/derivedLedger", () => ({
  makeLedgerRunIdFromSeed: jest.fn(() => "run_1"),
  writeDerivedLedgerRun: jest.fn(async () => undefined),
}));

import { recomputeDerivedTruthForDay } from "../recomputeForDay";

describe("recomputeDerivedTruthForDay — energy carry-forward", () => {
  const dailyFactsSet: jest.Mock = jest.fn(async () => undefined);

  beforeEach(() => {
    dailyFactsSet.mockClear();
  });

  it("attaches energy when profile and last-known body weight exist", async () => {
    const mockDb = {
      collection: (name: string) => {
        if (name !== "users") throw new Error("unexpected root collection");
        return {
          doc: () => ({
            collection: (sub: string) => {
              if (sub === "profile") {
                return {
                  doc: () => ({
                    get: async () => ({
                      exists: true,
                      data: () => ({
                        identity: { dateOfBirth: "1990-01-01", sexAtBirth: "female" },
                        body: { heightCm: 168 },
                      }),
                    }),
                  }),
                };
              }
              if (sub === "events") {
                return {
                  where: () => ({
                    get: async () => ({ docs: [] as { data: () => unknown }[] }),
                  }),
                };
              }
              if (sub === "dailyFacts") {
                return {
                  where: () => ({
                    where: () => ({
                      get: async () => ({ docs: [] as { data: () => unknown }[] }),
                      orderBy: () => ({
                        limit: () => ({
                          get: async () => ({
                            docs: [
                              {
                                data: () => ({
                                  date: "2026-05-03",
                                  body: { weightKg: 74.2, bodyFatPercent: 22 },
                                }),
                              },
                            ],
                          }),
                        }),
                      }),
                    }),
                  }),
                  doc: () => ({ set: dailyFactsSet }),
                };
              }
              if (sub === "insights" || sub === "intelligenceContext") {
                return {
                  doc: () => ({ set: async () => undefined }),
                };
              }
              if (sub === "healthScores") {
                return {
                  where: () => ({
                    where: () => ({
                      get: async () => ({ docs: [] as { data: () => unknown }[] }),
                    }),
                  }),
                };
              }
              throw new Error(`unexpected subcollection ${sub}`);
            },
          }),
        };
      },
    } as unknown as Firestore;

    await recomputeDerivedTruthForDay({
      db: mockDb,
      userId: "u1",
      dayKey: "2026-05-05",
      trigger: { type: "admin", source: "unit_test" },
    });

    expect(dailyFactsSet).toHaveBeenCalledTimes(1);
    const firstCall = dailyFactsSet.mock.calls[0];
    if (!firstCall) throw new Error("dailyFacts set not called");
    const written = firstCall[0] as { energy?: { factors?: { baseline?: unknown; steps?: unknown } } };
    expect(written.energy).toBeDefined();
    expect(written.energy?.factors?.baseline).toBeDefined();
    expect(written.energy?.factors?.steps).toBeDefined();
  });
});
