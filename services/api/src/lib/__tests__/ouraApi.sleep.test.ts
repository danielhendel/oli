/**
 * Oura sleep mapping — mapOuraSleepToIngestItem and field-name variants.
 * Regression: Oura API v2 can return bedtime_start/bedtime_end or start/end instead of bed_time/wake_time.
 */
import {
  mapOuraReadinessToHrvItem,
  mapOuraSleepToIngestItem,
  normalizeOuraLatencyRawToMinutes,
  type OuraSleepDocument,
  type OuraSleepIngestItem,
} from "../ouraApi";

describe("mapOuraReadinessToHrvItem", () => {
  it("maps average_hrv to rmssdMs when rmssd_5min fields are absent (Oura v2 daily_readiness)", () => {
    const doc = {
      id: "readiness_1",
      day: "2026-05-11",
      timestamp: "2026-05-11T08:15:00.000Z",
      average_hrv: 51,
    };
    const item = mapOuraReadinessToHrvItem(doc);
    expect(item).toMatchObject({
      idempotencyKey: "readiness_1",
      day: "2026-05-11",
      rmssdMs: 51,
      measurementType: "nightly",
    });
  });

  it("prefers rmssd_5min over average_hrv when both exist", () => {
    const doc = {
      id: "r2",
      day: "2026-05-10",
      timestamp: "2026-05-10T07:00:00.000Z",
      rmssd_5min: 60,
      average_hrv: 40,
    };
    const item = mapOuraReadinessToHrvItem(doc);
    expect(item?.rmssdMs).toBe(60);
  });

  it("maps average_heart_rate to restingHeartRateBpm when in plausible range", () => {
    const doc = {
      id: "r3",
      day: "2026-05-09",
      timestamp: "2026-05-09T06:00:00.000Z",
      average_hrv: 45,
      average_heart_rate: 58,
    };
    const item = mapOuraReadinessToHrvItem(doc);
    expect(item?.restingHeartRateBpm).toBe(58);
  });
});

describe("normalizeOuraLatencyRawToMinutes", () => {
  it("treats values >= 60 as seconds (matches oura-sleep-view read path)", () => {
    expect(normalizeOuraLatencyRawToMinutes(300)).toBe(5);
    expect(normalizeOuraLatencyRawToMinutes(90)).toBe(2);
  });

  it("treats small values as minutes", () => {
    expect(normalizeOuraLatencyRawToMinutes(12)).toBe(12);
    expect(normalizeOuraLatencyRawToMinutes(45)).toBe(45);
  });
});

describe("mapOuraSleepToIngestItem", () => {
  it("prefers Oura sleep API day field over inferred rollup when present", () => {
    const doc: OuraSleepDocument = {
      id: "s_api_day",
      day: "2026-04-19",
      bed_time: "2026-04-18T22:00:00Z",
      wake_time: "2026-04-19T11:00:00Z",
      total_sleep_duration: 29160,
      type: "long_sleep",
    };
    const result = mapOuraSleepToIngestItem(doc);
    expect(result?.day).toBe("2026-04-19");
  });

  it("maps doc with bed_time and wake_time to valid ingest item", () => {
    const doc: OuraSleepDocument = {
      id: "s1",
      bed_time: "2025-03-13T22:00:00Z",
      wake_time: "2025-03-14T06:00:00Z",
      total_sleep_duration: 28800,
      type: "long_sleep",
    };
    const result = mapOuraSleepToIngestItem(doc);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      idempotencyKey: "s1",
      start: "2025-03-13T22:00:00Z",
      end: "2025-03-14T06:00:00Z",
      day: "2025-03-14",
      totalMinutes: 480,
      isMainSleep: true,
    });
  });

  it("maps rem_sleep_duration and deep_sleep_duration seconds to minutes", () => {
    const doc: OuraSleepDocument = {
      id: "s_stages",
      bed_time: "2025-03-13T22:00:00Z",
      wake_time: "2025-03-14T06:00:00Z",
      total_sleep_duration: 28800,
      rem_sleep_duration: 7200,
      deep_sleep_duration: 3600,
      type: "long_sleep",
    };
    const result = mapOuraSleepToIngestItem(doc);
    expect(result?.remSleepMinutes).toBe(120);
    expect(result?.deepSleepMinutes).toBe(60);
  });

  it("maps latency >= 60 as seconds into latencyMinutes (Oura raw latency)", () => {
    const doc: OuraSleepDocument = {
      id: "s_lat",
      bed_time: "2025-03-13T22:00:00Z",
      wake_time: "2025-03-14T06:00:00Z",
      total_sleep_duration: 28800,
      latency: 300,
      type: "long_sleep",
    };
    const result = mapOuraSleepToIngestItem(doc);
    expect(result?.latencyMinutes).toBe(5);
  });

  it("maps doc with bedtime_start and bedtime_end to valid ingest item (Oura v2 variant)", () => {
    const doc = {
      id: "s2",
      bedtime_start: "2025-03-14T23:00:00Z",
      bedtime_end: "2025-03-15T07:00:00Z",
      total_sleep_duration: 28800,
      type: "sleep",
    } as OuraSleepDocument;
    const result = mapOuraSleepToIngestItem(doc);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      idempotencyKey: "s2",
      start: "2025-03-14T23:00:00Z",
      end: "2025-03-15T07:00:00Z",
      day: "2025-03-15",
      totalMinutes: 480,
      isMainSleep: true,
    });
  });

  it("maps doc with only start and end to valid ingest item (regression: was dropped before fix)", () => {
    const doc = {
      id: "s3",
      start: "2025-03-10T21:30:00Z",
      end: "2025-03-11T05:45:00Z",
      total_sleep_duration: 29700,
    } as OuraSleepDocument;
    const result = mapOuraSleepToIngestItem(doc);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      idempotencyKey: "s3",
      start: "2025-03-10T21:30:00Z",
      end: "2025-03-11T05:45:00Z",
      day: "2025-03-11",
      totalMinutes: 495,
    });
  });

  it("returns null when no start/end variant is present", () => {
    const doc = {
      id: "s4",
      total_sleep_duration: 28800,
      efficiency: 90,
    } as OuraSleepDocument;
    const result = mapOuraSleepToIngestItem(doc);
    expect(result).toBeNull();
  });

  it("returns null when start is present but end is missing", () => {
    const doc = {
      id: "s5",
      bed_time: "2025-03-14T22:00:00Z",
    } as OuraSleepDocument;
    const result = mapOuraSleepToIngestItem(doc);
    expect(result).toBeNull();
  });

  it("infers end from start + total_sleep_duration when wake/bedtime_end are missing", () => {
    const doc = {
      id: "s_infer_end",
      bed_time: "2025-03-13T22:00:00Z",
      total_sleep_duration: 28800,
      type: "long_sleep",
    } as OuraSleepDocument;
    const result = mapOuraSleepToIngestItem(doc);
    expect(result).not.toBeNull();
    expect(result!.end).toBe("2025-03-14T06:00:00.000Z");
    expect(result!.totalMinutes).toBe(480);
  });

  it("treats efficiency in 0–1 as ratio (does not divide again)", () => {
    const doc: OuraSleepDocument = {
      id: "s_eff_ratio",
      bed_time: "2025-03-13T22:00:00Z",
      wake_time: "2025-03-14T06:00:00Z",
      total_sleep_duration: 28800,
      efficiency: 0.88,
      type: "long_sleep",
    };
    const result = mapOuraSleepToIngestItem(doc);
    expect(result?.efficiency).toBe(0.88);
  });

  it("regression: 38 docs with start/end only all map to ingest items (no mass drop)", () => {
    const docs: OuraSleepDocument[] = Array.from({ length: 38 }, (_, i) => ({
      id: `oura_sleep_${i}`,
      start: `2025-03-${String(15 - Math.floor(i / 2)).padStart(2, "0")}T22:00:00Z`,
      end: `2025-03-${String(16 - Math.floor(i / 2)).padStart(2, "0")}T06:00:00Z`,
      total_sleep_duration: 28800,
    })) as OuraSleepDocument[];
    const items = docs.map(mapOuraSleepToIngestItem).filter((x): x is OuraSleepIngestItem => x !== null);
    expect(items.length).toBe(38);
  });
});
