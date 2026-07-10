import {
  buildSleepNightFromOuraSleepDocument,
  coerceOuraSleepScore0to100,
} from "../sleepNight";
import type { OuraSleepDocument } from "../ouraApi";

describe("coerceOuraSleepScore0to100", () => {
  it("maps string digits to number", () => {
    expect(coerceOuraSleepScore0to100("96")).toBe(96);
    expect(coerceOuraSleepScore0to100(" 82 ")).toBe(82);
  });

  it("returns null for invalid strings", () => {
    expect(coerceOuraSleepScore0to100("x")).toBeNull();
    expect(coerceOuraSleepScore0to100("")).toBeNull();
  });

  it("clamps to 0–100", () => {
    expect(coerceOuraSleepScore0to100(150)).toBe(100);
    expect(coerceOuraSleepScore0to100(-3)).toBe(0);
  });
});

describe("buildSleepNightFromOuraSleepDocument", () => {
  const baseDoc: OuraSleepDocument = {
    id: "s1",
    day: "2026-04-19",
    bed_time: "2026-04-18T22:00:00Z",
    wake_time: "2026-04-19T11:00:00Z",
    total_sleep_duration: 29160,
    type: "long_sleep",
    rem_sleep_duration: 7200,
    deep_sleep_duration: 3600,
    efficiency: 94,
    latency: 1020,
  };

  it("prefers Oura API day as anchorDay when present", () => {
    const r = buildSleepNightFromOuraSleepDocument(
      { ...baseDoc, score: "88" } as OuraSleepDocument,
      { sourceDocumentId: "s1" },
    );
    expect(r).not.toBeNull();
    expect(r?.anchorDay).toBe("2026-04-19");
    expect(r?.merge.wakeDay).toBe("2026-04-19");
  });

  it("derives wakeDay from endedAt when Oura day is absent", () => {
    const rest = { ...baseDoc };
    delete (rest as { day?: string }).day;
    const r = buildSleepNightFromOuraSleepDocument(rest, { sourceDocumentId: "s1" });
    expect(r).not.toBeNull();
    expect(r?.merge.wakeDay).toBe("2026-04-19");
  });

  it("prefers Oura day as wakeDay when it is after UTC(endedAt) (east-of-UTC morning skew)", () => {
    // Wake 06:30 Asia/Tokyo on 2026-07-10 == 2026-07-09T21:30:00.000Z
    const r = buildSleepNightFromOuraSleepDocument(
      {
        id: "asia1",
        day: "2026-07-10",
        bed_time: "2026-07-09T15:00:00.000Z",
        wake_time: "2026-07-09T21:30:00.000Z",
        total_sleep_duration: 23400,
        type: "long_sleep",
      } as OuraSleepDocument,
      { sourceDocumentId: "asia1" },
    );
    expect(r).not.toBeNull();
    expect(r?.anchorDay).toBe("2026-07-10");
    expect(r?.merge.wakeDay).toBe("2026-07-10");
  });

  it("keeps UTC end as wakeDay when Oura day is earlier (bed-day rollup)", () => {
    const r = buildSleepNightFromOuraSleepDocument(
      {
        id: "bed1",
        day: "2026-07-09",
        bed_time: "2026-07-09T02:00:00.000Z",
        wake_time: "2026-07-10T10:30:00.000Z",
        total_sleep_duration: 28800,
        type: "long_sleep",
      } as OuraSleepDocument,
      { sourceDocumentId: "bed1" },
    );
    expect(r).not.toBeNull();
    expect(r?.anchorDay).toBe("2026-07-09");
    expect(r?.merge.wakeDay).toBe("2026-07-10");
  });

  it("returns null for nap when bed/wake unresolved; long_sleep only builds nights", () => {
    const nap = buildSleepNightFromOuraSleepDocument(
      {
        id: "nap1",
        day: "2026-07-10",
        type: "nap",
        total_sleep_duration: 2400,
      } as OuraSleepDocument,
      { sourceDocumentId: "nap1" },
    );
    expect(nap).toBeNull();
  });

  it("maps score string to number in merge payload", () => {
    const r = buildSleepNightFromOuraSleepDocument(
      { ...baseDoc, score: "88" } as OuraSleepDocument,
      { sourceDocumentId: "s1" },
    );
    expect(r?.merge.score).toBe(88);
  });

  it("produces metrics without score when score absent", () => {
    const r = buildSleepNightFromOuraSleepDocument(baseDoc, { sourceDocumentId: "s1" });
    expect(r?.merge.score).toBeUndefined();
    expect(r?.merge.totalSleepMinutes).toBe(486);
  });

  it("returns null when bed/wake cannot be resolved", () => {
    const r = buildSleepNightFromOuraSleepDocument({ id: "x", total_sleep_duration: 100 } as OuraSleepDocument, {
      sourceDocumentId: "x",
    });
    expect(r).toBeNull();
  });

  it("persists lowestHeartRateBpm and averageHrvMs from Oura sleep document", () => {
    const r = buildSleepNightFromOuraSleepDocument(
      {
        ...baseDoc,
        lowest_heart_rate: 50,
        average_hrv: 21,
      } as OuraSleepDocument,
      { sourceDocumentId: "s1" },
    );
    expect(r?.merge.lowestHeartRateBpm).toBe(50);
    expect(r?.merge.averageHrvMs).toBe(21);
    expect(r?.merge.physiologySource).toBe("oura_sleep_doc");
  });
});
