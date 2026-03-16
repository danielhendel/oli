/**
 * Oura vendor snapshot writer — shape and write behavior.
 */
import { userCollection } from "../../db";
import {
  writeOuraVendorSleepSnapshots,
  writeOuraVendorReadinessSnapshots,
  fillSleepContributorsFromStored,
} from "../ouraVendorSnapshot";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

describe("ouraVendorSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({ set: mockSet }),
      firestore: {
        batch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
      },
    });
  });

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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.id).toBe("oura_sleep_1");
      expect(payload.day).toBe("2025-03-14");
      expect(payload.score).toBe(85);
      expect(payload.contributors).toMatchObject({ total_sleep: 90, efficiency: 88, restfulness: 82 });
      expect(Object.keys(payload.contributors)).toContain("total_sleep");
      expect(Object.keys(payload.contributors)).toContain("efficiency");
      expect(Object.keys(payload.contributors)).toContain("restfulness");
      expect(Object.values(payload.contributors).every((v) => typeof v === "number")).toBe(true);
      expect(payload.source).toBe("oura");
      expect(typeof payload.fetchedAt).toBe("string");
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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.id).toBe("oura_sleep_v2_1");
      expect(payload.day).toBe("2025-03-14");
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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.day).toBe("2025-03-10");
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
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.id).toBe("oura_sleep_no_score");
      expect(payload.day).toBe("2025-03-14");
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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
      expect(payload.id).toBe("valid_1");
      expect(payload.day).toBe("2025-03-14");
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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
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
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      const payload = mockBatchSet.mock.calls[0][1];
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
});
