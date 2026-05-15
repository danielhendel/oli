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

  it("treats surrounding whitespace on day keys as ignorable when comparing alignment", () => {
    expect(
      isOuraViewAlignedToDay(
        sleepView({
          requestedDay: " 2026-05-01 ",
          resolvedDay: " 2026-05-01 ",
          day: "2026-05-01",
        }),
        "2026-05-01",
      ),
    ).toBe(true);
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

const EXPECTED_ROW_IDS = [
  "deep_sleep",
  "rem_sleep",
  "sleep_efficiency",
  "lowest_heart_rate",
  "average_hrv",
] as const;

describe("buildDailySleepCardModel", () => {
  it("puts main sleep duration in headlineValueText using main over total", () => {
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
    expect(m.headlineValueText).toBe("8h 22m");
    expect(m.metricRows.find((r) => r.id === "sleep_efficiency")?.value).toBe("94%");
    expect(m.metricRows.map((r) => r.id)).toEqual([...EXPECTED_ROW_IDS]);
  });

  it("uses total sleep minutes for headline when main is absent", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 400,
          efficiency: 0.9,
          remMinutes: 60,
          deepMinutes: 50,
          score: 70,
        }),
      }),
    );
    expect(m.headlineValueText).toBe("6h 40m");
    expect(m.metricRows.find((r) => r.id === "sleep_efficiency")?.value).toBe("90%");
  });

  it("formats deep/rem from minute fields and keeps score on model", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          efficiency: 63,
          remMinutes: 60,
          deepMinutes: 45,
          score: 80,
        }),
      }),
    );
    expect(m.headlineValueText).toBe("8h");
    expect(m.metricRows.find((r) => r.id === "sleep_efficiency")?.value).toBe("63%");
    expect(m.metricRows.find((r) => r.id === "deep_sleep")?.value).toBe("45m");
    expect(m.metricRows.find((r) => r.id === "rem_sleep")?.value).toBe("1h");
    expect(m.scoreValueText).toBe("80");
  });

  it("shows metrics without score when score is absent", () => {
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
    expect(m.headlineValueText).toBe("8h");
    expect(m.hasAnySignal).toBe(true);
  });

  it("keeps score and rating on model when score is present", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          score: 82,
        }),
      }),
    );
    expect(m.scoreValueText).toBe("82");
    expect(m.ratingLabel).toBe("Good");
    expect(m.ratingTone).toBe("good");
  });

  it("keeps five metric rows in priority order without a Sleep duration row", () => {
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
    expect(m.metricRows).toHaveLength(5);
    expect(m.metricRows.map((r) => r.id)).toEqual([...EXPECTED_ROW_IDS]);
  });

  it("renders em dash for lowest heart rate and average HRV when absent on SleepNight", () => {
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
    expect(m.metricRows.find((r) => r.id === "lowest_heart_rate")?.value).toBe("\u2014");
    expect(m.metricRows.find((r) => r.id === "average_hrv")?.value).toBe("\u2014");
  });

  it("renders lowest heart rate and average HRV from SleepNight when present", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          efficiency: 0.9,
          remMinutes: 60,
          deepMinutes: 50,
          lowestHeartRateBpm: 50,
          averageHrvMs: 21,
        }),
      }),
    );
    expect(m.metricRows.find((r) => r.id === "lowest_heart_rate")?.value).toBe("50 bpm");
    expect(m.metricRows.find((r) => r.id === "average_hrv")?.value).toBe("21 ms");
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

  it("includes REM percent in REM row detail context when total sleep is known", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          totalSleepMinutes: 480,
          efficiency: 0.9,
          remMinutes: 120,
        }),
      }),
    );
    const rem = m.metricRows.find((r) => r.id === "rem_sleep");
    expect(rem?.value).toBe("2h");
    expect(rem?.detail.contextLine).toMatch(/25%/);
  });

  it("does not surface Readiness copy in the model", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({ totalSleepMinutes: 400, score: 90 }),
      }),
    );
    expect(JSON.stringify(m)).not.toMatch(/readiness/i);
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
    expect(m.lastNightSubtitle).toBe("Last night\u2019s sleep");
    expect(m.headlineValueText).toBe("8h 50m");
    const deep = m.metricRows.find((r) => r.id === "deep_sleep");
    expect(deep?.detail.contextLine).toContain(anchor);
    expect(deep?.detail.contextLine).toContain(requested);
  });

  it("shows last-night subtitle whenever there is sleep signal including exact_anchor", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        resolution: "exact_anchor",
        sleepNight: minimalNight({ totalSleepMinutes: 400, score: 80 }),
      }),
    );
    expect(m.lastNightSubtitle).toBe("Last night\u2019s sleep");
  });

  it("headline shows 9h 11m for 551 main sleep minutes", () => {
    const m = buildDailySleepCardModel(
      settledArgs({
        sleepNight: minimalNight({
          mainSleepMinutes: 551,
          efficiency: 0.92,
          remMinutes: 124,
          deepMinutes: 76,
        }),
      }),
    );
    expect(m.headlineValueText).toBe("9h 11m");
    expect(m.metricRows.find((r) => r.id === "rem_sleep")?.value).toBe("2h 4m");
    expect(m.metricRows.find((r) => r.id === "deep_sleep")?.value).toBe("1h 16m");
    expect(m.metricRows.find((r) => r.id === "sleep_efficiency")?.value).toBe("92%");
  });

  it("renders 96 Optimal on model from SleepNight score", () => {
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
    expect(m.day).toBe(anchor);
    expect(m.scoreValueText).toBe("96");
    expect(m.ratingLabel).toBe("Optimal");
  });
});

describe("emptyDailySleepCardModel", () => {
  it("returns five placeholder rows, no headline, and stable empty copy", () => {
    const m = emptyDailySleepCardModel(day);
    expect(m.hasAnySignal).toBe(false);
    expect(m.headlineValueText).toBeNull();
    expect(m.metricRows).toHaveLength(5);
    expect(m.metricRows.every((r) => r.value === "\u2014")).toBe(true);
    expect(m.summarySentence).toBe("");
    expect(m.emptyStateTitle).toBe("No sleep data yet");
    expect(m.emptyStateSubtitle).toMatch(/Sync Oura/);
    expect(m.lastNightSubtitle).toBeNull();
  });
});
