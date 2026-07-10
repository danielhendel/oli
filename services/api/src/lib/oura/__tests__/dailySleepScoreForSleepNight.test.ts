import {
  findDailySleepDocForSleepNight,
  indexOuraDailySleepByDay,
  mergeDailySleepScoreIntoSleepNightPayload,
  scoreFromOuraDailySleepDoc,
} from "../dailySleepScoreForSleepNight";
import type { OuraDailySleepDocument } from "../../ouraApi";

describe("dailySleepScoreForSleepNight", () => {
  const dayDoc = (day: string, score: unknown, id = `ds_${day}`): OuraDailySleepDocument => ({
    id,
    day,
    score: score as number | null,
  });

  it("indexes by day and prefers a scored row", () => {
    const byDay = indexOuraDailySleepByDay([
      dayDoc("2026-07-09", null),
      dayDoc("2026-07-09", 82, "ds_scored"),
    ]);
    expect(scoreFromOuraDailySleepDoc(byDay.get("2026-07-09")!)).toBe(82);
  });

  it("accepts Oura band boundary scores", () => {
    for (const score of [0, 59, 60, 69, 70, 84, 85, 100] as const) {
      expect(scoreFromOuraDailySleepDoc(dayDoc("2026-07-09", score))).toBe(score);
    }
  });

  it("rejects missing, null, non-number, and out-of-range scores", () => {
    expect(scoreFromOuraDailySleepDoc(dayDoc("2026-07-09", null))).toBeNull();
    expect(scoreFromOuraDailySleepDoc(dayDoc("2026-07-09", undefined))).toBeNull();
    expect(scoreFromOuraDailySleepDoc(dayDoc("2026-07-09", Number.NaN))).toBeNull();
    expect(scoreFromOuraDailySleepDoc(dayDoc("2026-07-09", 101))).toBeNull();
    expect(scoreFromOuraDailySleepDoc(dayDoc("2026-07-09", -1))).toBeNull();
    expect(scoreFromOuraDailySleepDoc({ id: "x", day: "2026-07-09" })).toBeNull();
  });

  it("rejects invalid or missing day when indexing", () => {
    const byDay = indexOuraDailySleepByDay([
      { id: "bad", day: "07-09-2026", score: 80 },
      { id: "noday", score: 80 },
      dayDoc("2026-07-09", 80),
    ]);
    expect(byDay.size).toBe(1);
    expect(byDay.get("2026-07-09")?.score).toBe(80);
  });

  it("ignores prior-day and future-day scores for a night", () => {
    const merge: Record<string, unknown> = {
      anchorDay: "2026-07-09",
      wakeDay: "2026-07-10",
    };
    expect(
      mergeDailySleepScoreIntoSleepNightPayload(merge, [
        dayDoc("2026-07-08", 91),
        dayDoc("2026-07-11", 92),
      ]).merged,
    ).toBe(false);
  });

  it("repeat merge is idempotent when score already present", () => {
    const merge: Record<string, unknown> = {
      anchorDay: "2026-07-09",
      wakeDay: "2026-07-10",
      score: 77,
    };
    const first = mergeDailySleepScoreIntoSleepNightPayload(merge, [dayDoc("2026-07-10", 91)]);
    const second = mergeDailySleepScoreIntoSleepNightPayload(merge, [dayDoc("2026-07-10", 91)]);
    expect(first.merged).toBe(false);
    expect(second.merged).toBe(false);
    expect(merge.score).toBe(77);
  });

  it("prefers wake day then anchor day", () => {
    const byDay = indexOuraDailySleepByDay([
      dayDoc("2026-07-09", 70),
      dayDoc("2026-07-10", 88),
    ]);
    expect(findDailySleepDocForSleepNight("2026-07-09", "2026-07-10", byDay)?.day).toBe("2026-07-10");
    expect(findDailySleepDocForSleepNight("2026-07-09", null, byDay)?.day).toBe("2026-07-09");
  });

  it("merges score when SleepNight lacks one", () => {
    const merge: Record<string, unknown> = {
      anchorDay: "2026-07-09",
      wakeDay: "2026-07-10",
    };
    const result = mergeDailySleepScoreIntoSleepNightPayload(merge, [dayDoc("2026-07-10", 91)]);
    expect(result.merged).toBe(true);
    expect(result.scoreDay).toBe("2026-07-10");
    expect(merge.score).toBe(91);
  });

  it("does not overwrite an existing score including 0", () => {
    const merge: Record<string, unknown> = {
      anchorDay: "2026-07-09",
      wakeDay: "2026-07-10",
      score: 0,
    };
    const result = mergeDailySleepScoreIntoSleepNightPayload(merge, [dayDoc("2026-07-10", 91)]);
    expect(result.merged).toBe(false);
    expect(merge.score).toBe(0);
  });

  it("does not merge a mismatched day score", () => {
    const merge: Record<string, unknown> = {
      anchorDay: "2026-07-09",
      wakeDay: "2026-07-10",
    };
    const result = mergeDailySleepScoreIntoSleepNightPayload(merge, [dayDoc("2026-07-08", 91)]);
    expect(result.merged).toBe(false);
    expect(merge.score).toBeUndefined();
  });
});
