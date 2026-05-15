jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import { sleepNightDocumentSchema, type SleepNightDocumentDto } from "@oli/contracts/sleepNight";
import { dayMinus, resolveSleepNightViewFromBoundedReads } from "../sleepNightRead";
import { coerceRawSleepNightForRead } from "../sleepNightReadCoerce";

function night(over: Partial<SleepNightDocumentDto> & Pick<SleepNightDocumentDto, "anchorDay" | "wakeDay">): SleepNightDocumentDto {
  return {
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "x",
    isComplete: true,
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...over,
  };
}

describe("resolveSleepNightViewFromBoundedReads", () => {
  it("prefers exact anchor for D when endedAt was missing but inferrable, over D−1 wake_day", () => {
    const rawExact: Record<string, unknown> = {
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: "s13",
      anchorDay: "2026-05-13",
      isComplete: false,
      startedAt: "2026-05-13T01:00:00.000Z",
      mainSleepMinutes: 551,
      totalSleepMinutes: 551,
      efficiency: 0.92,
      remMinutes: 124,
      deepMinutes: 76,
      score: 77,
    };
    const exactDto = sleepNightDocumentSchema.parse(coerceRawSleepNightForRead(rawExact, "2026-05-13"));
    const minus1 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T08:00:00.000Z",
      mainSleepMinutes: 522,
      score: 70,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exactDto, minus1, null);
    expect(r?.resolution).toBe("exact_anchor");
    expect(r?.sleepNight.mainSleepMinutes).toBe(551);
  });

  it("returns exact_anchor when exact doc is complete", () => {
    const exact = night({
      anchorDay: "2026-05-10",
      wakeDay: "2026-05-11",
      endedAt: "2026-05-11T08:00:00.000Z",
      score: 90,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-10", exact, null, null);
    expect(r?.resolution).toBe("exact_anchor");
    expect(r?.anchorDay).toBe("2026-05-10");
    expect(r?.sleepNight.anchorDay).toBe("2026-05-10");
  });

  it("2026-05-14: complete exact anchor wins over older complete nights (no two-nights-ago fallback)", () => {
    const exact = night({
      anchorDay: "2026-05-14",
      wakeDay: "2026-05-15",
      endedAt: "2026-05-15T07:00:00.000Z",
      score: 81,
      mainSleepMinutes: 410,
      totalSleepMinutes: 410,
      remMinutes: 80,
      deepMinutes: 52,
      efficiency: 91,
    });
    const minus1 = night({
      anchorDay: "2026-05-13",
      wakeDay: "2026-05-14",
      endedAt: "2026-05-14T06:00:00.000Z",
      score: 40,
      mainSleepMinutes: 300,
    });
    const minus2 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T08:00:00.000Z",
      score: 99,
      mainSleepMinutes: 500,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-14", exact, minus1, minus2);
    expect(r?.resolution).toBe("exact_anchor");
    expect(r?.anchorDay).toBe("2026-05-14");
    expect(r?.sleepNight.score).toBe(81);
    expect(r?.sleepNight.totalSleepMinutes).toBe(410);
    expect(r?.sleepNight.remMinutes).toBe(80);
    expect(r?.sleepNight.deepMinutes).toBe(52);
    expect(r?.sleepNight.efficiency).toBe(91);
  });

  it("for requested 2026-05-13 returns anchor 2026-05-12 when that night woke on the requested calendar day (wake_day)", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const d12 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T07:00:00.000Z",
      score: 77,
      mainSleepMinutes: 530,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, null);
    expect(r?.resolution).toBe("wake_day");
    expect(r?.anchorDay).toBe("2026-05-12");
    expect(r?.sleepNight.score).toBe(77);
  });

  it("2026-05-13 resolves wake_day when minus1 coerced from raw lacked wakeDay but has endedAt", () => {
    const raw: Record<string, unknown> = {
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: "s1",
      totalSleepMinutes: 530,
      mainSleepMinutes: 530,
      endedAt: "2026-05-13T07:00:00.000Z",
      isComplete: false,
    };
    const minus1 = sleepNightDocumentSchema.parse(coerceRawSleepNightForRead(raw, "2026-05-12"));
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, minus1, null);
    expect(r?.resolution).toBe("wake_day");
    expect(r?.anchorDay).toBe("2026-05-12");
  });

  it("2026-05-13 resolves latest_completed_prior_night when wakeDay does not match but night is complete", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const d12 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-14",
      endedAt: "2026-05-14T05:00:00.000Z",
      score: 77,
      mainSleepMinutes: 530,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, null);
    expect(r?.resolution).toBe("latest_completed_prior_night");
    expect(r?.anchorDay).toBe("2026-05-12");
  });

  it("prefers wake_day over a complete prior night whose wakeDay does not match requested", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const d12 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T07:00:00.000Z",
      score: 55,
    });
    const d11 = night({
      anchorDay: "2026-05-11",
      wakeDay: "2026-05-12",
      endedAt: "2026-05-13T22:00:00.000Z",
      score: 99,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, d11);
    expect(r?.resolution).toBe("wake_day");
    expect(r?.anchorDay).toBe("2026-05-12");
    expect(r?.sleepNight.score).toBe(55);
  });

  it("when multiple wake_day candidates exist, picks latest by endedAt", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const d12 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T06:00:00.000Z",
      score: 50,
    });
    const d11 = night({
      anchorDay: "2026-05-11",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T08:00:00.000Z",
      score: 88,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, d11);
    expect(r?.resolution).toBe("wake_day");
    expect(r?.anchorDay).toBe("2026-05-11");
    expect(r?.sleepNight.score).toBe(88);
  });

  it("when both day-1 and day-2 are generic candidates, picks latest by endedAt", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const d12 = night({
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-14",
      endedAt: "2026-05-14T05:00:00.000Z",
      score: 60,
    });
    const d11 = night({
      anchorDay: "2026-05-11",
      wakeDay: "2026-05-14",
      endedAt: "2026-05-14T09:00:00.000Z",
      score: 70,
    });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, d11);
    expect(r?.resolution).toBe("latest_completed_prior_night");
    expect(r?.anchorDay).toBe("2026-05-11");
  });

  it("does not look beyond day-2 (unrelated older row is not returned)", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false });
    const d12 = night({ anchorDay: "2026-05-12", wakeDay: "2026-05-13", isComplete: false });
    const d11 = night({ anchorDay: "2026-05-11", wakeDay: "2026-05-12", isComplete: false });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, d11);
    expect(r).toBeNull();
  });

  it("incomplete exact doc does not block complete prior-night doc", () => {
    const exact = night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false, score: 99 });
    const d12 = night({ anchorDay: "2026-05-12", wakeDay: "2026-05-13", score: 77, isComplete: true });
    const r = resolveSleepNightViewFromBoundedReads("2026-05-13", exact, d12, null);
    expect(r?.anchorDay).toBe("2026-05-12");
    expect(r?.sleepNight.score).toBe(77);
  });

  it("returns null when bounded lookback has no complete night", () => {
    const r = resolveSleepNightViewFromBoundedReads(
      "2026-05-13",
      night({ anchorDay: "2026-05-13", wakeDay: "2026-05-14", isComplete: false }),
      night({ anchorDay: "2026-05-12", wakeDay: "2026-05-13", isComplete: false }),
      null,
    );
    expect(r).toBeNull();
  });
});

describe("dayMinus", () => {
  it("subtracts UTC calendar days", () => {
    expect(dayMinus("2026-05-13", 1)).toBe("2026-05-12");
    expect(dayMinus("2026-05-13", 2)).toBe("2026-05-11");
  });
});
