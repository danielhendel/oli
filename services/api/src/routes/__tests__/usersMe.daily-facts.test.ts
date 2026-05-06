// GET /users/me/daily-facts — stored DailyFacts only for activity; optional body-only synthesis when doc missing
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection, userDoc } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  userDoc: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

function emptyEventsQueryMock() {
  const chain = {
    where: (): typeof chain => chain,
    get: async () => ({ docs: [] as { data: () => unknown }[] }),
  };
  return chain;
}

/** rawEvents: query path for body synthesis when dailyFacts doc is missing */
function rawEventsMockWithDoc(
  opts: {
    whereDocs?: { data: () => unknown }[];
    docGet?: (id: string) => Promise<{ exists: boolean; data?: () => unknown }>;
  },
) {
  const whereDocs = opts.whereDocs ?? [];
  const docGet =
    opts.docGet ??
    (async () => ({
      exists: false as const,
    }));
  const chain = {
    where: (): typeof chain => chain,
    get: async () => ({ docs: whereDocs }),
  };
  return {
    where: (): typeof chain => chain,
    doc: (id: string) => ({
      get: () => docGet(id),
    }),
  };
}

describe("GET /users/me/daily-facts", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_body_test";
      next();
    });
    app.use("/users/me", usersMeRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => jest.resetAllMocks());

  test("returns 200 with synthesized body when dailyFacts missing and raw weight exists for day", async () => {
    const weightDoc = {
      kind: "weight",
      observedAt: "2026-04-01T14:00:00.000Z",
      sourceId: "apple_health",
      payload: {
        time: "2026-04-01T14:00:00.000Z",
        timezone: "UTC",
        weightKg: 81.2,
      },
    };

    (userCollection as jest.Mock).mockImplementation((uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (name === "rawEvents") {
        return rawEventsMockWithDoc({
          whereDocs: [{ data: () => weightDoc }],
        });
      }
      if (name === "events") {
        return emptyEventsQueryMock();
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({
        data: () => ({ preferences: { metricSources: {} } }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-01`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { body?: { weightKg?: number }; meta?: { source?: unknown } };
    expect(json.body?.weightKg).toBeCloseTo(81.2, 5);
    expect(json.meta?.source).toEqual(expect.objectContaining({ synthesizedFromRaw: true }));
  });

  test("returns 404 when dailyFacts missing and no raw body for day", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (name === "rawEvents") {
        return rawEventsMockWithDoc({});
      }
      if (name === "events") {
        return emptyEventsQueryMock();
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-01`);
    expect(res.status).toBe(404);
  });

  test("returns 404 when dailyFacts missing and only canonical steps exist (no activity synthesis)", async () => {
    const stepsCanonical = {
      kind: "steps",
      day: "2026-04-02",
      steps: 9500,
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (name === "rawEvents") {
        return rawEventsMockWithDoc({});
      }
      if (name === "events") {
        const eventsQuery = {
          where: (): typeof eventsQuery => eventsQuery,
          get: async () => ({ docs: [{ data: () => stepsCanonical }] }),
        };
        return eventsQuery;
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-02`);
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error?: { code?: string; resource?: string } };
    expect(json.error?.code).toBe("NOT_FOUND");
    expect(json.error?.resource).toBe("dailyFacts");
  });

  test("returns 404 when dailyFacts missing and only apple_health raw steps exist (no raw steps synthesis)", async () => {
    const stepsRaw = {
      kind: "steps",
      provider: "apple_health",
      payload: { steps: 8421 },
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (name === "rawEvents") {
        return rawEventsMockWithDoc({
          docGet: async (id: string) => {
            if (id === "appleHealth:v2:steps:2026-04-05") {
              return { exists: true, data: () => stepsRaw };
            }
            return { exists: false };
          },
        });
      }
      if (name === "events") {
        return emptyEventsQueryMock();
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-05`);
    expect(res.status).toBe(404);
  });

  test("returns stored dailyFacts activity.steps unchanged when doc omits merge with canonical", async () => {
    const storedFacts = {
      schemaVersion: 1,
      userId: "user_body_test",
      date: "2026-04-22",
      computedAt: "2026-04-22T10:00:00.000Z",
      activity: { distanceKm: 3.2, steps: 120 },
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => storedFacts }),
          }),
        };
      }
      if (name === "events") {
        const eventsQuery = {
          where: (): typeof eventsQuery => eventsQuery,
          get: async () => ({
            docs: [{ id: "e1", data: () => ({ kind: "steps", day: "2026-04-22", sourceId: "apple_health", steps: 6060 }) }],
          }),
        };
        return eventsQuery;
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-22`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      activity?: { steps?: number; distanceKm?: number };
    };
    expect(json.activity?.steps).toBe(120);
    expect(json.activity?.distanceKm).toBe(3.2);
  });

  test("returns stored doc without adding activity.steps from canonical when sleep-only doc", async () => {
    const storedFacts = {
      schemaVersion: 1,
      userId: "user_body_test",
      date: "2026-04-20",
      computedAt: "2026-04-20T10:00:00.000Z",
      sleep: { totalMinutes: 420 },
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => storedFacts }),
          }),
        };
      }
      if (name === "events") {
        const eventsQuery = {
          where: (): typeof eventsQuery => eventsQuery,
          get: async () => ({ docs: [{ id: "appleHealth:v2:steps:2026-04-20", data: () => ({ kind: "steps", steps: 7777 }) }] }),
        };
        return eventsQuery;
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-20`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { activity?: { steps?: number }; sleep?: { totalMinutes?: number } };
    expect(json.sleep?.totalMinutes).toBe(420);
    expect(json.activity).toBeUndefined();
  });

  test("returns stored dailyFacts with optional energy block", async () => {
    const storedFacts = {
      schemaVersion: 1,
      userId: "user_body_test",
      date: "2026-04-23",
      computedAt: "2026-04-23T10:00:00.000Z",
      energy: {
        modelVersion: "daily_energy_v3",
        computedAt: "2026-04-23T10:00:00.000Z",
        day: "2026-04-23",
        estimatedKcal: { low: 2200, high: 2700, midpoint: 2450 },
        variancePct: 0.204,
        confidence: "moderate",
        factors: {
          baseline: {
            kcalLow: 1564,
            kcalHigh: 1870,
            confidence: "moderate",
            inputsUsed: ["restingMetabolicRateKcal"],
            inputsMissing: ["dateOfBirth", "sexAtBirth", "heightCm"],
          },
          steps: {
            kcalLow: 382,
            kcalHigh: 518,
            confidence: "high",
            inputsUsed: ["steps", "weightKg"],
            inputsMissing: [],
          },
        },
        missingRequiredInputs: [],
        largestDriver: "baseline",
      },
      energyInfluencers: {
        movement: { steps: 9543, distanceMeters: 7120 },
        cardio: { durationMinutes: 28, distanceMeters: 4120, sport: "Running" },
      },
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => storedFacts }),
          }),
        };
      }
      if (name === "events") {
        return emptyEventsQueryMock();
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-23`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      energy?: {
        modelVersion?: string;
        estimatedKcal?: { low?: number; high?: number };
      };
      energyInfluencers?: { movement?: { steps?: number } };
    };
    expect(json.energy?.modelVersion).toBe("daily_energy_v3");
    expect(json.energy?.estimatedKcal?.low).toBe(2200);
    expect(json.energy?.estimatedKcal?.high).toBe(2700);
    expect(json.energyInfluencers?.movement?.steps).toBe(9543);
  });
});
