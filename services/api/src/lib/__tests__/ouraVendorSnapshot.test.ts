/**
 * Oura vendor snapshot writer — shape and write behavior.
 */
import { userCollection } from "../../db";
import {
  writeOuraVendorSleepSnapshots,
  writeOuraVendorReadinessSnapshots,
  writeOuraVendorStressSnapshots,
  fillSleepContributorsFromStored,
} from "../ouraVendorSnapshot";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ __: "ServerTimestamp" })),
  },
}));

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

function mockReadinessCollection() {
  return {
    doc: jest.fn(() => ({
      set: mockSet,
      get: jest.fn().mockResolvedValue({ exists: false }),
    })),
    where: jest.fn(() => ({
      limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ docs: [] }) })),
    })),
    firestore: {
      batch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
    },
  };
}

describe("ouraVendorSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "ouraVendorReadiness") return mockReadinessCollection();
      return {
        doc: () => ({ set: mockSet }),
        firestore: {
          batch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
        },
      };
    });
  });

  function vendorSnapshotWrites(): unknown[][] {
    return mockBatchSet.mock.calls.filter((c) => (c[1] as { source?: string }).source === "oura");
  }

  function sleepNightWrites(): unknown[][] {
    return mockBatchSet.mock.calls.filter((c) => (c[1] as { source?: string }).source === "ouraVendorSleep");
  }

  describe("writeOuraVendorSleepSnapshots", () => {
    it("writes snapshot with id, day, score, contributors, source, fetchedAt", async () => {
      const docs = [
        {
          id: "oura_sleep_1",
          bed_time: "2025-03-14T22:00:00Z",
          wake_time: "2025-03-15T06:00:00Z",
          total_sleep_duration: 28800,
          efficiency: 92,
          latency: 300,
          score: 85,
          contributors: { total_sleep: 90, efficiency: 88, restfulness: 82 },
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];

      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");

      expect(userCollection).toHaveBeenCalledWith("uid1", "ouraVendorSleep");
      expect(userCollection).toHaveBeenCalledWith("uid1", "sleepNights");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
      const vendorCalls = vendorSnapshotWrites();
      expect(vendorCalls).toHaveLength(1);
      const payload = vendorCalls[0]![1] as Record<string, unknown>;
      expect(payload.id).toBe("oura_sleep_1");
      expect(payload.day).toBe("2025-03-15");
      expect(payload.score).toBe(85);
      expect(payload.contributors).toMatchObject({ total_sleep: 90, efficiency: 88, restfulness: 82 });
      expect(Object.keys(payload.contributors as object)).toContain("total_sleep");
      expect(Object.keys(payload.contributors as object)).toContain("efficiency");
      expect(Object.keys(payload.contributors as object)).toContain("restfulness");
      expect(Object.values(payload.contributors as Record<string, number>).every((v) => typeof v === "number")).toBe(
        true,
      );
      expect(payload.source).toBe("oura");
      expect(typeof payload.fetchedAt).toBe("string");

      const nightCalls = sleepNightWrites();
      expect(nightCalls).toHaveLength(1);
      const nightPayload = nightCalls[0]![1] as Record<string, unknown>;
      expect(nightPayload.anchorDay).toBe("2025-03-15");
      expect(nightPayload.source).toBe("ouraVendorSleep");
      expect(nightPayload.updatedAt).toEqual({ __: "ServerTimestamp" });
    });

    it("skips doc when day cannot be derived", async () => {
      await writeOuraVendorSleepSnapshots("uid1", [{} as import("../ouraApi").OuraSleepDocument], "req-1");
      expect(mockBatchSet).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it("writes snapshot from doc with bedtime_start/bedtime_end only (Oura v2 variant)", async () => {
      const docs = [
        {
          id: "oura_sleep_v2_1",
          bedtime_start: "2025-03-14T23:00:00Z",
          bedtime_end: "2025-03-15T07:00:00Z",
          total_sleep_duration: 28800,
          score: 82,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.id).toBe("oura_sleep_v2_1");
      expect(payload.day).toBe("2025-03-15");
      expect(payload.score).toBe(82);
      expect(payload.source).toBe("oura");
    });

    it("writes snapshot from doc with start/end only (regression: was skipped before fix)", async () => {
      const docs = [
        {
          id: "s_start_end",
          start: "2025-03-10T21:00:00Z",
          end: "2025-03-11T05:00:00Z",
          score: 78,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.day).toBe("2025-03-11");
      expect(payload.source).toBe("oura");
    });

    it("writes snapshot when score is missing (Firestore-safe: no undefined)", async () => {
      const docs = [
        {
          id: "oura_sleep_no_score",
          bed_time: "2025-03-14T22:00:00Z",
          wake_time: "2025-03-15T06:00:00Z",
          total_sleep_duration: 28800,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.id).toBe("oura_sleep_no_score");
      expect(payload.day).toBe("2025-03-15");
      expect(payload.source).toBe("oura");
      expect(Object.prototype.hasOwnProperty.call(payload, "score")).toBe(false);
      expect(Object.values(payload).every((v) => v !== undefined)).toBe(true);
    });

    it("one doc missing day does not prevent other snapshots from being written", async () => {
      const docs = [
        {} as import("../ouraApi").OuraSleepDocument,
        {
          id: "valid_1",
          bed_time: "2025-03-14T22:00:00Z",
          wake_time: "2025-03-15T06:00:00Z",
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.id).toBe("valid_1");
      expect(payload.day).toBe("2025-03-15");
    });

    it("prefers Oura API day on vendor snapshot when present (matches ingest rollup)", async () => {
      const docs = [
        {
          id: "oura_sleep_api_day",
          day: "2026-04-19",
          bed_time: "2026-04-18T22:00:00Z",
          wake_time: "2026-04-19T11:00:00Z",
          total_sleep_duration: 29160,
          score: 88,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.day).toBe("2026-04-19");
    });

  it("preserves lowestHeartRateBpm, averageHrvMs, and payload on vendor sleep snapshot", async () => {
      const docs = [
        {
          id: "s_phys",
          day: "2026-05-15",
          bedtime_start: "2026-05-14T23:00:00.000Z",
          bedtime_end: "2026-05-15T07:50:00.000Z",
          total_sleep_duration: 24600,
          lowest_heart_rate: 50,
          average_hrv: 21,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-vendor-phys");
      const vendorPayload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(vendorPayload.lowestHeartRateBpm).toBe(50);
      expect(vendorPayload.averageHrvMs).toBe(21);
      expect(vendorPayload.payload).toBeDefined();
      expect((vendorPayload.payload as Record<string, unknown>).lowest_heart_rate).toBe(50);
    });

  it("2026-05-15: sleep document physiology (50 bpm / 21 ms) wins over readiness", async () => {
      const docs = [
        {
          id: "s_2026_05_15",
          day: "2026-05-15",
          bedtime_start: "2026-05-14T23:00:00.000Z",
          bedtime_end: "2026-05-15T07:50:00.000Z",
          total_sleep_duration: 24600,
          score: 81,
          lowest_heart_rate: 50,
          average_hrv: 21,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      const readiness = [
        { day: "2026-05-15", lowest_heart_rate: 48, average_hrv: 23 },
      ] as import("../ouraApi").OuraDailyReadinessDocument[];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-dash-515", readiness);
      const nightPayload = sleepNightWrites()[0]![1] as Record<string, unknown>;
      expect(nightPayload.anchorDay).toBe("2026-05-15");
      expect(nightPayload.lowestHeartRateBpm).toBe(50);
      expect(nightPayload.averageHrvMs).toBe(21);
    });

  it("2026-05-14: Oura day + inferred end writes vendor + sleepNight headline metrics + readiness physiology", async () => {
      const docs = [
        {
          id: "s_2026_05_14",
          day: "2026-05-14",
          bedtime_start: "2026-05-13T23:00:00.000Z",
          total_sleep_duration: 24600,
          score: 81,
          efficiency: 91,
          rem_sleep_duration: 4800,
          deep_sleep_duration: 3120,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      const readiness = [
        { day: "2026-05-14", lowest_heart_rate: 50, average_hrv: 23 },
      ] as import("../ouraApi").OuraDailyReadinessDocument[];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-dash-514", readiness);
      expect(userCollection).toHaveBeenCalledWith("uid1", "sleepNights");
      const vendorPayload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(vendorPayload.day).toBe("2026-05-14");
      const nightPayload = sleepNightWrites()[0]![1] as Record<string, unknown>;
      expect(nightPayload.anchorDay).toBe("2026-05-14");
      expect(nightPayload.score).toBe(81);
      expect(nightPayload.totalSleepMinutes).toBe(410);
      expect(nightPayload.efficiency).toBe(91);
      expect(nightPayload.remMinutes).toBe(80);
      expect(nightPayload.deepMinutes).toBe(52);
      expect(nightPayload.isComplete).toBe(true);
      expect(nightPayload.lowestHeartRateBpm).toBe(50);
      expect(nightPayload.averageHrvMs).toBe(23);
    });

    it("merges physiology from persisted ouraVendorReadiness when API readiness array is omitted", async () => {
      const docs = [
        {
          id: "s_2026_05_14",
          day: "2026-05-14",
          bedtime_start: "2026-05-13T23:00:00.000Z",
          total_sleep_duration: 24600,
          score: 81,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
        if (name === "ouraVendorReadiness") {
          return {
            doc: jest.fn((day: string) => ({
              get: jest.fn().mockResolvedValue({
                exists: day === "2026-05-14",
                data: () =>
                  day === "2026-05-14"
                    ? { day: "2026-05-14", lowestHeartRateBpm: 50, averageHrvMs: 23 }
                    : undefined,
              }),
            })),
            where: jest.fn(() => ({
              limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ docs: [] }) })),
            })),
            firestore: {
              batch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
            },
          };
        }
        return {
          doc: () => ({ set: mockSet }),
          firestore: {
            batch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
          },
        };
      });

      await writeOuraVendorSleepSnapshots("uid1", docs, "req-persisted-readiness");

      const nightPayload = sleepNightWrites()[0]![1] as Record<string, unknown>;
      expect(nightPayload.lowestHeartRateBpm).toBe(50);
      expect(nightPayload.averageHrvMs).toBe(23);
    });

    it("writes contributors derived from doc when API does not send contributors", async () => {
      const docs = [
        {
          id: "derived_1",
          bed_time: "2025-03-14T22:00:00Z",
          wake_time: "2025-03-15T06:00:00Z",
          total_sleep_duration: 28800,
          efficiency: 85,
          latency: 600,
          restful_sleep: 78,
          rem_sleep_duration: 7200,
          deep_sleep_duration: 3600,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.contributors).toBeDefined();
      expect(typeof payload.contributors).toBe("object");
      expect(payload.contributors.total_sleep).toBeDefined();
      expect(payload.contributors.efficiency).toBeDefined();
      expect(payload.contributors.restfulness).toBeDefined();
      expect(payload.contributors.rem_sleep).toBeDefined();
      expect(payload.contributors.deep_sleep).toBeDefined();
      expect(payload.contributors.latency).toBeDefined();
      expect(Object.values(payload.contributors).every((v) => typeof v === "number")).toBe(true);
      expect(Object.values(payload).every((v) => v !== undefined)).toBe(true);
    });

    it("derives total_sleep contributor for short sleep (any duration)", async () => {
      const docs = [
        {
          id: "short_sleep",
          bed_time: "2025-03-14T22:00:00Z",
          wake_time: "2025-03-15T06:41:00Z",
          total_sleep_duration: 2460,
          efficiency: 70,
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.contributors?.total_sleep).toBeDefined();
      expect(typeof payload.contributors?.total_sleep).toBe("number");
      expect(payload.contributors.total_sleep).toBeGreaterThanOrEqual(0);
      expect(payload.contributors.total_sleep).toBeLessThanOrEqual(100);
      expect(payload.contributors.total_sleep).toBe(Math.round((2460 / 60 / 540) * 100));
    });

    it("does not write undefined contributor values (Firestore-safe)", async () => {
      const docs = [
        {
          id: "minimal_1",
          bed_time: "2025-03-14T22:00:00Z",
          wake_time: "2025-03-15T06:00:00Z",
          contributors: { total_sleep: 80, efficiency: undefined, restfulness: 70 },
        } as unknown as import("../ouraApi").OuraSleepDocument,
      ];
      await writeOuraVendorSleepSnapshots("uid1", docs, "req-1");
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      const payload = vendorSnapshotWrites()[0]![1] as Record<string, unknown>;
      expect(payload.contributors).toBeDefined();
      expect(Object.keys(payload.contributors)).toContain("total_sleep");
      expect(Object.keys(payload.contributors)).toContain("restfulness");
      expect(Object.values(payload.contributors).every((v) => v !== undefined)).toBe(true);
    });
  });

  describe("fillSleepContributorsFromStored", () => {
    it("fills total_sleep for short sleep when missing from stored contributors", () => {
      const result = fillSleepContributorsFromStored({
        totalSleepDuration: 2460,
        contributors: { deep_sleep: 3, efficiency: 63, latency: 51, rem_sleep: 4 },
      });
      expect(result.total_sleep).toBeDefined();
      expect(result.total_sleep).toBe(Math.round((2460 / 60 / 540) * 100));
      expect(result.efficiency).toBe(63);
      expect(result.deep_sleep).toBe(3);
      expect(result.latency).toBe(51);
      expect(result.rem_sleep).toBe(4);
    });

    it("fills restfulness from restfulSleep when missing", () => {
      const result = fillSleepContributorsFromStored({
        totalSleepDuration: 28800,
        efficiency: 85,
        restfulSleep: 78,
        remSleep: 7200,
        deepSleep: 3600,
        latency: 600,
      });
      expect(result.restfulness).toBe(78);
      expect(result.total_sleep).toBeDefined();
      expect(result.efficiency).toBe(85);
    });

    it("does not override existing contributor values", () => {
      const result = fillSleepContributorsFromStored({
        contributors: { efficiency: 99, total_sleep: 50 },
        totalSleepDuration: 28800,
        efficiency: 85,
      });
      expect(result.efficiency).toBe(99);
      expect(result.total_sleep).toBe(50);
    });
  });

  describe("writeOuraVendorReadinessSnapshots", () => {
    it("writes snapshot with id, day, score, contributors, source, fetchedAt", async () => {
      const docs = [
        {
          id: "oura_readiness_1",
          day: "2025-03-15",
          timestamp: "2025-03-15T08:00:00Z",
          score: 78,
          contributors: { resting_heart_rate: 75, hrv_balance: 80 },
        } as unknown as import("../ouraApi").OuraDailyReadinessDocument,
      ];

      await writeOuraVendorReadinessSnapshots("uid1", docs, "req-1");

      expect(userCollection).toHaveBeenCalledWith("uid1", "ouraVendorReadiness");
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.id).toBe("oura_readiness_1");
      expect(payload.day).toBe("2025-03-15");
      expect(payload.score).toBe(78);
      expect(payload.contributors).toEqual({ resting_heart_rate: 75, hrv_balance: 80 });
      expect(payload.source).toBe("oura");
      expect(typeof payload.fetchedAt).toBe("string");
    });

    it("skips doc when day and timestamp are missing", async () => {
      await writeOuraVendorReadinessSnapshots("uid1", [{} as import("../ouraApi").OuraDailyReadinessDocument], "req-1");
      expect(mockBatchSet).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it("writes snapshot when score is missing (Firestore-safe: no undefined)", async () => {
      const docs = [
        {
          id: "oura_readiness_no_score",
          day: "2025-03-15",
          timestamp: "2025-03-15T08:00:00Z",
        } as unknown as import("../ouraApi").OuraDailyReadinessDocument,
      ];
      await writeOuraVendorReadinessSnapshots("uid1", docs, "req-1");
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.id).toBe("oura_readiness_no_score");
      expect(payload.day).toBe("2025-03-15");
      expect(payload.source).toBe("oura");
      expect(Object.prototype.hasOwnProperty.call(payload, "score")).toBe(false);
      expect(Object.values(payload).every((v) => v !== undefined)).toBe(true);
    });
  });

  describe("writeOuraVendorStressSnapshots", () => {
    it("writes snapshot with camelCase fields, schemaVersion 1, and deterministic id fallback", async () => {
      const docs = [
        {
          day: "2025-03-15",
          day_summary: "restored",
          stress_high: 90,
          recovery_high: 120,
        } as unknown as import("../ouraApi").OuraDailyStressDocument,
      ];

      await writeOuraVendorStressSnapshots("uid1", docs, "req-1");

      expect(userCollection).toHaveBeenCalledWith("uid1", "ouraVendorStress");
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1] as Record<string, unknown>;
      expect(payload.id).toBe("oura_daily_stress_2025-03-15");
      expect(payload.day).toBe("2025-03-15");
      expect(payload.daySummary).toBe("restored");
      expect(payload.stressHighSeconds).toBe(90);
      expect(payload.recoveryHighSeconds).toBe(120);
      expect(payload.source).toBe("oura");
      expect(payload.schemaVersion).toBe(1);
      expect(typeof payload.fetchedAt).toBe("string");
      expect(payload).not.toHaveProperty("payload");
      expect(Object.values(payload).every((v) => v !== undefined)).toBe(true);
    });

    it("skips doc when day is missing", async () => {
      await writeOuraVendorStressSnapshots("uid1", [{} as import("../ouraApi").OuraDailyStressDocument], "req-1");
      expect(mockBatchSet).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });
  });
});
