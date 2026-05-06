// Admin recompute must apply the same workout classification as aggregateDailyFacts
// (Apple TraditionalStrengthTraining → strength only, not cardio).

jest.mock("firebase-functions/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../adminAuth", () => ({
  requireAdmin: async () => ({ ok: true, status: 200, message: "ok" }),
}));

const mockSetCalls: { path: string; data: Record<string, unknown> }[] = [];

jest.mock("../../firebaseAdmin", () => {
  const strengthWorkoutCanonical = {
    kind: "workout" as const,
    id: "canon_lift_1",
    userId: "u_strength",
    sourceId: "healthkit",
    start: "2026-05-06T15:00:00.000Z",
    end: "2026-05-06T15:45:00.000Z",
    day: "2026-05-06",
    timezone: "America/New_York",
    createdAt: "2026-05-06T16:00:00.000Z",
    updatedAt: "2026-05-06T16:00:00.000Z",
    schemaVersion: 1,
    sport: "TraditionalStrengthTraining",
    durationMinutes: 45,
    trainingLoad: 14,
  };

  const weightCanonical = {
    kind: "weight" as const,
    id: "canon_w_1",
    userId: "u_strength",
    sourceId: "healthkit",
    start: "2026-05-06T08:00:00.000Z",
    end: "2026-05-06T08:00:00.000Z",
    day: "2026-05-06",
    timezone: "America/New_York",
    createdAt: "2026-05-06T08:01:00.000Z",
    updatedAt: "2026-05-06T08:01:00.000Z",
    schemaVersion: 1,
    weightKg: 80,
  };

  const mkDocRef = (path: string) => ({
    path,
    async get() {
      return { exists: false, data: () => undefined };
    },
    async set(data: Record<string, unknown>) {
      mockSetCalls.push({ path, data });
    },
  });

  const mkDailyFactsQuery = () => {
    const q = {
      where: () => q,
      orderBy: () => q,
      limit: () => q,
      get: async () => ({ docs: [] as { data: () => unknown }[] }),
    };
    return q;
  };

  const db = {
    collection(name: string) {
      return {
        doc(docId: string) {
          const base = `${name}/${docId}`;
          return {
            collection(sub: string) {
              if (sub === "events") {
                return {
                  where: () => ({
                    get: async () => ({
                      docs: [{ data: () => strengthWorkoutCanonical }, { data: () => weightCanonical }],
                    }),
                  }),
                };
              }
              if (sub === "dailyFacts") {
                return {
                  where: () => mkDailyFactsQuery(),
                  doc: (id: string) => mkDocRef(`${base}/dailyFacts/${id}`),
                };
              }
              if (sub === "profile") {
                return {
                  doc: () => ({
                    get: async () => ({
                      exists: true,
                      data: () => ({
                        identity: { dateOfBirth: "1990-01-01", sexAtBirth: "male" },
                        body: { heightCm: 180 },
                      }),
                    }),
                  }),
                };
              }
              return {
                where: () => mkDailyFactsQuery(),
                doc: (id: string) => mkDocRef(`${base}/${sub}/${id}`),
              };
            },
          };
        },
      };
    },
  };

  return { db };
});

jest.mock("../../dailyFacts/loadBodyFactsFromRawForDay", () => ({
  loadBodyFactsFromRawForDay: jest.fn(async () => undefined),
}));

import { recomputeDailyFactsAdminHttp } from "../recomputeDailyFactsAdminHttp";

describe("recomputeDailyFactsAdminHttp — strength vs cardio classification", () => {
  beforeEach(() => {
    mockSetCalls.length = 0;
  });

  it("writes strength rollups for TraditionalStrengthTraining and omits dailyFacts.cardio + energy cardio factor", async () => {
    const req = {
      body: { userId: "u_strength", date: "2026-05-06" },
      header: () => "Bearer test",
    } as unknown as Parameters<typeof recomputeDailyFactsAdminHttp>[0];

    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as Parameters<typeof recomputeDailyFactsAdminHttp>[1];

    await recomputeDailyFactsAdminHttp(req, res);

    const dailyFactsWrite = mockSetCalls.find((c) => c.path.endsWith("/dailyFacts/2026-05-06"));
    expect(dailyFactsWrite).toBeTruthy();
    const data = dailyFactsWrite!.data as {
      cardio?: unknown;
      strength?: { primarySport?: string; durationMinutes?: number };
      energy?: { factors?: { cardio?: unknown } };
    };

    expect(data.cardio).toBeUndefined();
    expect(data.strength?.primarySport).toBe("TraditionalStrengthTraining");
    expect(data.strength?.durationMinutes).toBe(45);
    expect(data.energy?.factors?.cardio).toBeUndefined();
  });
});
