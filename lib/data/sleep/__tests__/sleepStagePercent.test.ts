import { describe, expect, it } from "@jest/globals";

import type { SleepNightDocumentDto } from "@oli/contracts";

import {
  deriveSleepStagePercentUnrounded,
  formatSleepStagePercentOfTotal,
  resolveSleepStagePercent,
} from "@/lib/data/sleep/sleepStagePercent";

const day = "2026-05-18";

function night(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: day,
    wakeDay: day,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "s1",
    isComplete: true,
    updatedAt: "2026-05-18T12:00:00.000Z",
    totalSleepMinutes: 450,
    mainSleepMinutes: 999,
    deepMinutes: 50,
    remMinutes: 132,
    deepPercent: 11,
    remPercent: 29,
    ...over,
  };
}

describe("resolveSleepStagePercent", () => {
  it("prefers stored deep percent when consistent with totalSleepMinutes", () => {
    const result = resolveSleepStagePercent({ night: night(), metricId: "deep_sleep" });
    expect(result).toEqual({
      value: 11,
      displayPercent: 11,
      source: "stored",
    });
  });

  it("prefers stored rem percent when consistent", () => {
    // 132/450*100 = 29.333… → stored 29 is within epsilon
    const result = resolveSleepStagePercent({ night: night(), metricId: "rem_sleep" });
    expect(result?.source).toBe("stored");
    expect(result?.displayPercent).toBe(29);
  });

  it("derives when stored percent is absent", () => {
    const result = resolveSleepStagePercent({
      night: night({ deepPercent: undefined }),
      metricId: "deep_sleep",
    });
    expect(result?.source).toBe("derived");
    expect(result?.displayPercent).toBe(11);
  });

  it("derives when stored percent is inconsistent with totalSleepMinutes", () => {
    const result = resolveSleepStagePercent({
      night: night({ deepPercent: 90 }),
      metricId: "deep_sleep",
    });
    expect(result?.source).toBe("derived");
    expect(result?.displayPercent).toBe(11);
  });

  it("omits percentage when stage minutes missing", () => {
    expect(
      resolveSleepStagePercent({
        night: night({ deepMinutes: undefined, deepPercent: 11 }),
        metricId: "deep_sleep",
      }),
    ).toBeNull();
  });

  it("omits percentage when totalSleepMinutes missing", () => {
    expect(
      resolveSleepStagePercent({
        night: night({ totalSleepMinutes: undefined }),
        metricId: "deep_sleep",
      }),
    ).toBeNull();
  });

  it("omits percentage when totalSleepMinutes is zero", () => {
    expect(
      resolveSleepStagePercent({
        night: night({ totalSleepMinutes: 0 }),
        metricId: "deep_sleep",
      }),
    ).toBeNull();
  });

  it("omits percentage when totalSleepMinutes is negative", () => {
    expect(
      resolveSleepStagePercent({
        night: night({ totalSleepMinutes: -10 }),
        metricId: "deep_sleep",
      }),
    ).toBeNull();
  });

  it("does not use mainSleepMinutes as denominator", () => {
    // total missing; main would yield a percent if wrongly used
    const result = resolveSleepStagePercent({
      night: night({
        totalSleepMinutes: undefined,
        mainSleepMinutes: 450,
        deepMinutes: 50,
        deepPercent: undefined,
      }),
      metricId: "deep_sleep",
    });
    expect(result).toBeNull();
  });

  it("does not treat missing as 0%", () => {
    expect(
      resolveSleepStagePercent({
        night: night({ deepMinutes: undefined, deepPercent: undefined }),
        metricId: "deep_sleep",
      }),
    ).toBeNull();
  });

  it("fails closed on non-finite inputs", () => {
    expect(
      deriveSleepStagePercentUnrounded({
        stageMinutes: Number.NaN,
        totalSleepMinutes: 450,
      }),
    ).toBeNull();
    expect(
      deriveSleepStagePercentUnrounded({
        stageMinutes: 50,
        totalSleepMinutes: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull();
  });

  it("formats percent of total sleep for display", () => {
    expect(formatSleepStagePercentOfTotal(11)).toBe("11% of total sleep");
  });

  it("allows zero stage minutes as a valid measured value", () => {
    const result = resolveSleepStagePercent({
      night: night({ deepMinutes: 0, deepPercent: 0 }),
      metricId: "deep_sleep",
    });
    expect(result?.displayPercent).toBe(0);
    expect(result?.source).toBe("stored");
  });
});
