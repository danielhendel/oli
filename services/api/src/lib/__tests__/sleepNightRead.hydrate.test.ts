jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

import type { SleepNightViewDto } from "@oli/contracts/sleepNight";
import {
  hydrateSleepNightDailyScore,
  hydrateSleepNightPhysiologyMetrics,
} from "../sleepNightRead";

const userCollection = jest.requireMock("../../db").userCollection as jest.Mock;

function baseView(over: Partial<SleepNightViewDto["sleepNight"]> = {}): SleepNightViewDto {
  return {
    requestedDay: "2026-05-14",
    anchorDay: "2026-05-13",
    wakeDay: "2026-05-14",
    resolution: "wake_day",
    isFallback: false,
    sleepNight: {
      anchorDay: "2026-05-13",
      wakeDay: "2026-05-14",
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: "s1",
      isComplete: true,
      endedAt: "2026-05-14T07:00:00.000Z",
      mainSleepMinutes: 400,
      ...over,
    },
  };
}

describe("hydrateSleepNightPhysiologyMetrics", () => {
  beforeEach(() => {
    userCollection.mockReset();
  });

  it("fills lowest HR and HRV from ouraVendorReadiness when absent on sleepNight", async () => {
    const readinessGet = jest.fn().mockResolvedValue({
      docs: [{ data: () => ({ lowestHeartRateBpm: 50, averageHrvMs: 23 }) }],
    });
    const directGet = jest.fn().mockResolvedValue({ exists: false });
    const factsGet = jest.fn().mockResolvedValue({ exists: false });

    userCollection.mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorReadiness") {
        return {
          doc: jest.fn(() => ({ get: directGet })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: readinessGet })),
          })),
        };
      }
      if (name === "dailyFacts") {
        return { doc: jest.fn(() => ({ get: factsGet })) };
      }
      return {};
    });

    const out = await hydrateSleepNightPhysiologyMetrics("u1", baseView());
    expect(out.sleepNight.lowestHeartRateBpm).toBe(50);
    expect(out.sleepNight.averageHrvMs).toBe(23);
    expect(readinessGet).toHaveBeenCalled();
  });

  it("fills only average HRV from dailyFacts when readiness lacks HRV", async () => {
    const readinessGet = jest.fn().mockResolvedValue({
      docs: [{ data: () => ({ lowestHeartRateBpm: 48 }) }],
    });
    const directGet = jest.fn().mockResolvedValue({ exists: false });
    const factsGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        energyInfluencers: { physiology: { hrvRmssdMs: 31 } },
      }),
    });

    userCollection.mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorReadiness") {
        return {
          doc: jest.fn(() => ({ get: directGet })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: readinessGet })),
          })),
        };
      }
      if (name === "dailyFacts") {
        return { doc: jest.fn(() => ({ get: factsGet })) };
      }
      return {};
    });

    const out = await hydrateSleepNightPhysiologyMetrics("u1", baseView());
    expect(out.sleepNight.lowestHeartRateBpm).toBe(48);
    expect(out.sleepNight.averageHrvMs).toBe(31);
  });

  it("returns unchanged when both metrics already on sleepNight", async () => {
    const view = baseView({ lowestHeartRateBpm: 40, averageHrvMs: 20 });
    const out = await hydrateSleepNightPhysiologyMetrics("u1", view);
    expect(out).toEqual(view);
    expect(userCollection).not.toHaveBeenCalled();
  });

  it("hydrates from linked rawEvents payload when vendor readiness omits physiology", async () => {
    const directGet = jest.fn().mockResolvedValue({
      exists: true,
      id: "readiness-1",
      data: () => ({ id: "readiness-1", day: "2026-05-14", score: 78 }),
    });
    const rawGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        payload: { lowest_heart_rate: 50, average_hrv: 23 },
      }),
    });
    const readinessGet = jest.fn().mockResolvedValue({ docs: [] });
    const factsGet = jest.fn().mockResolvedValue({ exists: false });

    userCollection.mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorReadiness") {
        return {
          doc: jest.fn(() => ({ get: directGet })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: readinessGet })),
          })),
        };
      }
      if (name === "rawEvents") {
        return { doc: jest.fn(() => ({ get: rawGet })) };
      }
      if (name === "dailyFacts") {
        return { doc: jest.fn(() => ({ get: factsGet })) };
      }
      return {};
    });

    const out = await hydrateSleepNightPhysiologyMetrics("u1", baseView());
    expect(out.sleepNight.lowestHeartRateBpm).toBe(50);
    expect(out.sleepNight.averageHrvMs).toBe(23);
    expect(rawGet).toHaveBeenCalled();
  });

  it("hydrates from nested payload on direct ouraVendorReadiness doc", async () => {
    const directGet = jest.fn().mockImplementation((id: string) => {
      if (id === "2026-05-14") {
        return Promise.resolve({
          exists: true,
          id: "2026-05-14",
          data: () => ({
            day: "2026-05-14",
            payload: { lowest_heart_rate: 50, average_hrv: 23 },
          }),
        });
      }
      return Promise.resolve({ exists: false });
    });
    const readinessGet = jest.fn().mockResolvedValue({ docs: [] });
    const factsGet = jest.fn().mockResolvedValue({ exists: false });

    userCollection.mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorReadiness") {
        return {
          doc: jest.fn((id: string) => ({ get: () => directGet(id) })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: readinessGet })),
          })),
        };
      }
      if (name === "dailyFacts") {
        return { doc: jest.fn(() => ({ get: factsGet })) };
      }
      return {};
    });

    const out = await hydrateSleepNightPhysiologyMetrics("u1", baseView());
    expect(out.sleepNight.lowestHeartRateBpm).toBe(50);
    expect(out.sleepNight.averageHrvMs).toBe(23);
  });
});

describe("hydrateSleepNightDailyScore", () => {
  beforeEach(() => {
    userCollection.mockReset();
  });

  it("fills score from ouraVendorSleep daily_sleep snapshot when SleepNight lacks score", async () => {
    const directGet = jest.fn().mockImplementation(async (id: string) => {
      if (id === "oura_daily_sleep_2026-05-14") {
        return {
          exists: true,
          data: () => ({ kind: "daily_sleep", day: "2026-05-14", score: 87 }),
        };
      }
      return { exists: false };
    });

    userCollection.mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorSleep") {
        return {
          doc: jest.fn((id: string) => ({ get: () => directGet(id) })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: async () => ({ docs: [] }) })),
          })),
        };
      }
      return {};
    });

    const out = await hydrateSleepNightDailyScore("u1", baseView());
    expect(out.sleepNight.score).toBe(87);
  });

  it("preserves score 0 already on SleepNight", async () => {
    const out = await hydrateSleepNightDailyScore("u1", baseView({ score: 0 }));
    expect(out.sleepNight.score).toBe(0);
    expect(userCollection).not.toHaveBeenCalled();
  });

  it("ignores period sleep snapshots without kind daily_sleep", async () => {
    const directGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ day: "2026-05-14", score: 99 }),
    });
    userCollection.mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorSleep") {
        return {
          doc: jest.fn(() => ({ get: directGet })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: async () => ({
                docs: [{ data: () => ({ day: "2026-05-14", score: 99 }) }],
              }),
            })),
          })),
        };
      }
      return {};
    });
    const out = await hydrateSleepNightDailyScore("u1", baseView());
    expect(out.sleepNight.score).toBeUndefined();
  });
});
