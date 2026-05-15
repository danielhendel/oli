import type { OuraSleepDocument } from "../../ouraApi";
import {
  buildSleepNightFirestorePayloadWithOuraReadiness,
  enrichReadinessRecordWithRawPayload,
  pickAverageHrvMsFromReadinessRecord,
  pickLowestHeartRateBpmFromReadinessRecord,
  readinessRecordsForPick,
} from "../readinessForSleepNightMerge";

describe("readinessForSleepNightMerge", () => {
  it("reads physiology from Oura API snake_case", () => {
    expect(
      pickLowestHeartRateBpmFromReadinessRecord({ lowest_heart_rate: 50 }),
    ).toBe(50);
    expect(pickAverageHrvMsFromReadinessRecord({ average_hrv: 23 })).toBe(23);
  });

  it("reads physiology from vendor snapshot camelCase", () => {
    expect(
      pickLowestHeartRateBpmFromReadinessRecord({ lowestHeartRateBpm: 50 }),
    ).toBe(50);
    expect(pickAverageHrvMsFromReadinessRecord({ averageHrvMs: 23 })).toBe(23);
  });

  it("reads physiology from nested payload and numeric strings", () => {
    const nested = {
      day: "2026-05-15",
      payload: { lowest_heart_rate: "50", average_hrv: "23" },
    };
    expect(readinessRecordsForPick(nested)).toHaveLength(2);
    expect(pickLowestHeartRateBpmFromReadinessRecord(nested)).toBe(50);
    expect(pickAverageHrvMsFromReadinessRecord(nested)).toBe(23);
  });

  it("reads HRV from rmssd_5min in nested payload when average_hrv absent", () => {
    expect(
      pickAverageHrvMsFromReadinessRecord({
        payload: { rmssd_5min: 31 },
      }),
    ).toBe(31);
  });

  it("reads HRV from ingest rmssdMs on readiness or nested payload", () => {
    expect(pickAverageHrvMsFromReadinessRecord({ rmssdMs: 23 })).toBe(23);
    expect(
      pickAverageHrvMsFromReadinessRecord({
        payload: { rmssdMs: "31" },
      }),
    ).toBe(31);
  });

  it("merges readiness from persisted map when API docs are empty", () => {
    const sleepDoc = {
      id: "s_2026_05_14",
      day: "2026-05-14",
      bedtime_start: "2026-05-13T23:00:00.000Z",
      total_sleep_duration: 24600,
      score: 81,
    } as unknown as OuraSleepDocument;

    const persisted = new Map<string, Record<string, unknown>>([
      [
        "2026-05-14",
        { day: "2026-05-14", lowestHeartRateBpm: 50, averageHrvMs: 23 },
      ],
    ]);

    const built = buildSleepNightFirestorePayloadWithOuraReadiness(
      sleepDoc,
      "s_2026_05_14",
      [],
      persisted,
    );
    expect(built?.anchorDay).toBe("2026-05-14");
    expect(built?.payload.lowestHeartRateBpm).toBe(50);
    expect(built?.payload.averageHrvMs).toBe(23);
  });

  it("enriches vendor readiness with linked raw payload for picking", () => {
    const vendor = { id: "r1", day: "2026-05-15", score: 78 };
    const enriched = enrichReadinessRecordWithRawPayload(vendor, {
      lowest_heart_rate: 50,
      average_hrv: 23,
    });
    expect(pickLowestHeartRateBpmFromReadinessRecord(enriched)).toBe(50);
    expect(pickAverageHrvMsFromReadinessRecord(enriched)).toBe(23);
  });

  it("merges physiology from persisted map with nested payload readiness", () => {
    const sleepDoc = {
      id: "s_2026_05_15",
      day: "2026-05-15",
      bedtime_start: "2026-05-14T23:00:00.000Z",
      total_sleep_duration: 24600,
      score: 81,
    } as unknown as OuraSleepDocument;

    const persisted = new Map<string, Record<string, unknown>>([
      [
        "2026-05-15",
        {
          day: "2026-05-15",
          payload: { lowest_heart_rate: 50, average_hrv: 23 },
        },
      ],
    ]);

    const built = buildSleepNightFirestorePayloadWithOuraReadiness(
      sleepDoc,
      "s_2026_05_15",
      [],
      persisted,
    );
    expect(built?.payload.lowestHeartRateBpm).toBe(50);
    expect(built?.payload.averageHrvMs).toBe(23);
  });

  it("2026-05-15: prefers Oura sleep document physiology over daily_readiness", () => {
    const sleepDoc = {
      id: "s_2026_05_15",
      day: "2026-05-15",
      bedtime_start: "2026-05-14T23:00:00.000Z",
      bedtime_end: "2026-05-15T07:50:00.000Z",
      total_sleep_duration: 24600,
      score: 81,
      lowest_heart_rate: 50,
      average_hrv: 21,
    } as unknown as OuraSleepDocument;

    const apiDocs = [{ day: "2026-05-15", lowest_heart_rate: 48, average_hrv: 23 }];

    const built = buildSleepNightFirestorePayloadWithOuraReadiness(
      sleepDoc,
      "s_2026_05_15",
      apiDocs,
    );
    expect(built?.anchorDay).toBe("2026-05-15");
    expect(built?.payload.lowestHeartRateBpm).toBe(50);
    expect(built?.payload.averageHrvMs).toBe(21);
    expect(built?.payload.physiologySource).toBe("oura_sleep_doc");
  });

  it("readiness fills gaps only when sleep doc lacks physiology fields", () => {
    const sleepDoc = {
      id: "s_no_phys",
      day: "2026-05-15",
      bedtime_start: "2026-05-14T23:00:00.000Z",
      total_sleep_duration: 24600,
    } as unknown as OuraSleepDocument;
    const apiDocs = [{ day: "2026-05-15", lowest_heart_rate: 50, average_hrv: 21 }];
    const built = buildSleepNightFirestorePayloadWithOuraReadiness(sleepDoc, "s_no_phys", apiDocs);
    expect(built?.payload.lowestHeartRateBpm).toBe(50);
    expect(built?.payload.averageHrvMs).toBe(21);
    expect(built?.payload.physiologySource).toBe("oura_readiness");
  });

  it("prefers wake-day readiness row over anchor when both exist", () => {
    const sleepDoc = {
      id: "s1",
      bed_time: "2026-05-13T22:00:00Z",
      wake_time: "2026-05-14T07:00:00Z",
      total_sleep_duration: 28800,
    } as unknown as OuraSleepDocument;

    const apiDocs = [
      { day: "2026-05-14", lowest_heart_rate: 50, average_hrv: 23 },
      { day: "2026-05-13", lowest_heart_rate: 99, average_hrv: 99 },
    ];

    const built = buildSleepNightFirestorePayloadWithOuraReadiness(sleepDoc, "s1", apiDocs);
    expect(built?.payload.lowestHeartRateBpm).toBe(50);
    expect(built?.payload.averageHrvMs).toBe(23);
  });
});
