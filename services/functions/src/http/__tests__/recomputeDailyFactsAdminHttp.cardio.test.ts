// Proves admin DailyFacts recompute persists cardio rollups + energy cardio when canonical workouts exist.

jest.mock("firebase-functions/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../adminAuth", () => ({
  requireAdmin: async () => ({ ok: true, status: 200, message: "ok" }),
}));

const mockSetCalls: { path: string; data: Record<string, unknown>; options?: unknown }[] = [];

jest.mock("../../firebaseAdmin", () => {
  const workoutCanonical = {
    kind: "workout" as const,
    id: "canon_run_1",
    userId: "u_cardio",
    sourceId: "healthkit",
    start: "2026-05-05T14:00:00.000Z",
    end: "2026-05-05T14:28:00.000Z",
    day: "2026-05-05",
    timezone: "America/New_York",
    createdAt: "2026-05-05T15:00:00.000Z",
    updatedAt: "2026-05-05T15:00:00.000Z",
    schemaVersion: 1,
    sport: "running",
    durationMinutes: 28,
    distanceMeters: 4120,
    trainingLoad: null,
  };

  const weightCanonical = {
    kind: "weight" as const,
    id: "canon_w_1",
    userId: "u_cardio",
    sourceId: "healthkit",
    start: "2026-05-05T08:00:00.000Z",
    end: "2026-05-05T08:00:00.000Z",
    day: "2026-05-05",
    timezone: "America/New_York",
    createdAt: "2026-05-05T08:01:00.000Z",
    updatedAt: "2026-05-05T08:01:00.000Z",
    schemaVersion: 1,
    weightKg: 78,
  };

  const mkDocRef = (path: string) => ({
    path,
    async get() {
      return { exists: false, data: () => undefined };
    },
    async set(data: Record<string, unknown>, options?: unknown) {
      mockSetCalls.push({ path, data, options });
    },
  });

  /** Supports history window (2× where + get) and energy prior-body (2× where + orderBy + limit + get). */
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
                      docs: [{ data: () => workoutCanonical }, { data: () => weightCanonical }],
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

describe("recomputeDailyFactsAdminHttp — cardio + energy", () => {
  beforeEach(() => {
    mockSetCalls.length = 0;
  });

  it("writes dailyFacts.cardio and energy.factors.cardio when canonical workout exists", async () => {
    const req = {
      body: { userId: "u_cardio", date: "2026-05-05" },
      header: () => "Bearer test",
    } as unknown as Parameters<typeof recomputeDailyFactsAdminHttp>[0];

    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as Parameters<typeof recomputeDailyFactsAdminHttp>[1];

    await recomputeDailyFactsAdminHttp(req, res);

    const dailyFactsWrite = mockSetCalls.find((c) => c.path.endsWith("/dailyFacts/2026-05-05"));
    expect(dailyFactsWrite).toBeTruthy();
    const data = dailyFactsWrite!.data as {
      cardio?: {
        durationMinutes: number;
        sessions: number;
        distanceMeters?: number;
        primarySport?: string;
        paceMinPerKm?: number;
        speedMetersPerSecond?: number;
      };
      energy?: { factors?: { cardio?: { kcalLow?: number; kcalHigh?: number } } };
      body?: { weightKg?: number };
    };
    expect(data.cardio).toMatchObject({
      durationMinutes: 28,
      distanceMeters: 4120,
      sessions: 1,
      primarySport: "running",
    });
    const durationMin = 28;
    const distanceM = 4120;
    const speedMps = distanceM / (durationMin * 60);
    expect(data.cardio?.speedMetersPerSecond).toBeCloseTo(speedMps, 10);
    expect(data.cardio?.paceMinPerKm).toBeCloseTo(1000 / (speedMps * 60), 10);
    expect(data.energy?.factors?.cardio?.kcalLow).toBeGreaterThan(0);
    expect(data.energy?.factors?.cardio?.kcalHigh).toBeGreaterThanOrEqual(
      data.energy?.factors?.cardio?.kcalLow ?? 0,
    );
  });
});
