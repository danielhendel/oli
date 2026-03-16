/**
 * Oura sleep mapping — mapOuraSleepToIngestItem and field-name variants.
 * Regression: Oura API v2 can return bedtime_start/bedtime_end or start/end instead of bed_time/wake_time.
 */
import {
  mapOuraSleepToIngestItem,
  type OuraSleepDocument,
  type OuraSleepIngestItem,
} from "../ouraApi";

describe("mapOuraSleepToIngestItem", () => {
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
      day: "2025-03-13",
      totalMinutes: 480,
      isMainSleep: true,
    });
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
      day: "2025-03-14",
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
      day: "2025-03-10",
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
