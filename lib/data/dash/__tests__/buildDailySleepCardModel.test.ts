import type { SleepNightDocumentDto, SleepViewDto } from "@oli/contracts";
import { isOuraViewAlignedToDay } from "../../oura/isOuraViewAlignedToDay";
import {
  buildDailySleepCardModel,
  emptyDailySleepCardModel,
} from "../buildDailySleepCardModel";
import { normalizeOuraSleepStageToMinutes } from "../ouraSleepStageMinutes";

const day = "2026-05-01";

function sleepView(
  over: Partial<SleepViewDto> & Pick<SleepViewDto, "requestedDay" | "resolvedDay" | "day">,
): SleepViewDto {
  return {
    isFallback: false,
    contributors: {},
    ...over,
  } as SleepViewDto;
}

function minimalNight(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: day,
    wakeDay: day,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "s1",
    isComplete: true,
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...over,
  };
}

describe("isOuraViewAlignedToDay", () => {
  it("returns true only when requested and resolved match the anchor day", () => {
    expect(isOuraViewAlignedToDay(undefined, day)).toBe(false);
    expect(
      isOuraViewAlignedToDay(
        sleepView({ requestedDay: day, resolvedDay: day, day, totalMinutes: 400 }),
        day,
      ),
    ).toBe(true);
    expect(
      isOuraViewAlignedToDay(
        sleepView({ requestedDay: day, resolvedDay: "2026-04-30", day: "2026-04-30" }),
        day,
      ),
    ).toBe(false);
  });
});

describe("normalizeOuraSleepStageToMinutes", () => {
  it("treats large values as seconds", () => {
    expect(normalizeOuraSleepStageToMinutes(7200)).toBe(120);
  });
  it("treats modest values as minutes", () => {
    expect(normalizeOuraSleepStageToMinutes(90)).toBe(90);
  });
});

function settledArgs(over: Partial<Parameters<typeof buildDailySleepCardModel>[0]>) {
  return {
    day,
    sleepNight: undefined as SleepNightDocumentDto | undefined,
    sleepNightSettled: true,
    ...over,
  };
}

const EXPECTED_ROW_IDS = ["sleep_duration", "deep_sleep", "rem_sleep", "sleep_efficiency"] as const;

describe("buildDailySleepCardModel", () => {
  it("puts Sleep Score in headline and Duration as first metric row", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          mainSleepMinutes: 502,
          totalSleepMinutes: 530,
          efficiency: 0.94,
          remMinutes: 90,
          deepMinutes: 60,
          score: 88,
        }),
      }),
    );
    expect(m.headlineValueText).toBe("88");
    expect(m.ratingLabel).toBe("Optimal");
    expect(m.metricRows.map((r) => r.id)).toEqual([...EXPECTED_ROW_IDS]);
    expect(m.metricRows[0]?.label).toBe("Duration");
    expect(m.metricRows[0]?.value).toBe("8h 22m");
    expect(m.metricRows.find((r) => r.id === "sleep_efficiency")?.value).toBe("94%");
  });

  it.each([
    [100, "Optimal"],
    [85, "Optimal"],
    [84, "Good"],
    [70, "Good"],
    [69, "Fair"],
    [60, "Fair"],
    [59, "Pay attention"],
    [0, "Pay attention"],
  ] as const)("classifies score %s as %s", (score, label) => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({ totalSleepMinutes: 480, score }),
      }),
    );
    expect(m.headlineValueText).toBe(String(score));
    expect(m.ratingLabel).toBe(label);
    expect(m.scoreUnavailable).toBe(false);
  });

  it("treats missing score as partial: duration remains, no fabricated zero rating", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          efficiency: 0.9,
          remMinutes: 60,
          deepMinutes: 50,
        }),
      }),
    );
    expect(m.scoreValueText).toBeNull();
    expect(m.headlineValueText).toBeNull();
    expect(m.scoreUnavailable).toBe(true);
    expect(m.scoreUnavailableLabel).toBe("Sleep score unavailable");
    expect(m.ratingLabel).toBeNull();
    expect(m.metricRows[0]?.value).toBe("8h");
    expect(m.hasAnySignal).toBe(true);
  });

  it("rejects invalid and out-of-range scores", () => {
    for (const score of [Number.NaN, 101, -1, Infinity] as number[]) {
      const m = buildDailySleepCardModel(
        settledArgs({
          sleepNight: minimalNight({ totalSleepMinutes: 400, score }),
        }),
      );
      expect(m.headlineValueText).toBeNull();
      expect(m.ratingLabel).toBeNull();
      expect(m.scoreUnavailable).toBe(true);
    }
  });

  it("does not include Lowest Heart Rate or Average HRV on Dash rows", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          lowestHeartRateBpm: 50,
          averageHrvMs: 21,
          score: 80,
        }),
      }),
    );
    expect(m.metricRows.map((r) => r.id)).toEqual([...EXPECTED_ROW_IDS]);
    expect(m.metricRows.map((r) => r.label).join("|")).not.toMatch(/Lowest heart rate|Average HRV/);
  });

  it("does not substitute readiness score into sleep model", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({ totalSleepMinutes: 400, score: 90 }),
      }),
    );
    expect(JSON.stringify(m)).not.toMatch(/readiness/i);
    expect(m.headlineValueText).toBe("90");
  });

  it("keeps four metric rows in priority order", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          efficiency: 0.9,
          remMinutes: 90,
          deepMinutes: 60,
        }),
      }),
    );
    expect(m.metricRows).toHaveLength(4);
    expect(m.metricRows.map((r) => r.id)).toEqual([...EXPECTED_ROW_IDS]);
  });

  it("attaches detail payload to each metric row", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 400,
          efficiency: 0.9,
          remMinutes: 60,
          deepMinutes: 50,
        }),
      }),
    );
    for (const row of m.metricRows) {
      expect(row.detail.title).toBe(row.label);
      expect(row.detail.value).toBe(row.value);
      expect(row.detail.body.length).toBeGreaterThan(10);
    }
  });

  it("uses sleepNight.anchorDay in metric detail when Dash day differs (prior night)", () => {
    const requested = "2026-05-13";
    const anchor = "2026-05-12";
    const m = buildDailySleepCardModel(
      settledArgs({
        day: requested,
        resolution: "wake_day",
        sleepNight: minimalNight({
          anchorDay: anchor,
          wakeDay: requested,
          totalSleepMinutes: 530,
          score: 77,
        }),
      }),
    );
    expect(m.day).toBe(requested);
    expect(m.scoreValueText).toBe("77");
    expect(m.headlineValueText).toBe("77");
    expect(m.lastNightSubtitle).toBe("Last night\u2019s sleep");
    const duration = m.metricRows.find((r) => r.id === "sleep_duration");
    expect(duration?.value).toBe("8h 50m");
    const deep = m.metricRows.find((r) => r.id === "deep_sleep");
    expect(deep?.detail.contextLine).toContain(anchor);
  });

  it("headline shows score 96 Optimal from SleepNight", () => {
    const anchor = "2026-05-11";
    const m = buildDailySleepCardModel(
      settledArgs({
        day: anchor,
        sleepNight: minimalNight({
          anchorDay: anchor,
          wakeDay: anchor,
          totalSleepMinutes: 400,
          score: 96,
        }),
      }),
    );
    expect(m.headlineValueText).toBe("96");
    expect(m.ratingLabel).toBe("Optimal");
  });
});

describe("emptyDailySleepCardModel", () => {
  it("returns four placeholder rows, no headline, and stable empty copy", () => {
    const m = emptyDailySleepCardModel(day);
    expect(m.hasAnySignal).toBe(false);
    expect(m.headlineValueText).toBeNull();
    expect(m.durationValueText).toBeNull();
    expect(m.metricRows).toHaveLength(4);
    expect(m.metricRows.every((r) => r.value === "\u2014")).toBe(true);
    expect(m.summarySentence).toBe("");
    expect(m.emptyStateTitle).toBe("No sleep data yet");
    expect(m.emptyStateSubtitle).toMatch(/Sync Oura/);
    expect(m.lastNightSubtitle).toBeNull();
  });
});
