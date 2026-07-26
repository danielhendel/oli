import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  averagePercentFromStageSamples,
  buildSleepStageAverageSummaries,
  buildSleepStageAverageSummary,
  SLEEP_STAGE_AVERAGE_7D_MIN_VALID,
  SLEEP_STAGE_AVERAGE_30D_MIN_VALID,
  SLEEP_STAGE_AVERAGE_90D_MIN_VALID,
} from "@/lib/data/sleep/sleepStageAverages";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function makeView(
  day: DayKey,
  over: Partial<SleepNightViewDto["sleepNight"]> & {
    deepMinutes?: number;
    remMinutes?: number;
    totalSleepMinutes?: number;
  } = {},
): SleepNightViewDto {
  const deepMinutes = over.deepMinutes ?? 50;
  const remMinutes = over.remMinutes ?? 120;
  const totalSleepMinutes = over.totalSleepMinutes ?? 450;
  return {
    requestedDay: day,
    anchorDay: day,
    wakeDay: day,
    resolution: "exact_anchor",
    isFallback: false,
    sleepNight: {
      anchorDay: day,
      wakeDay: day,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: `ep-${day}`,
      mainSleepMinutes: totalSleepMinutes,
      totalSleepMinutes,
      deepMinutes,
      remMinutes,
      deepPercent: Math.round((deepMinutes / totalSleepMinutes) * 100),
      remPercent: Math.round((remMinutes / totalSleepMinutes) * 100),
      isComplete: true,
      ...over,
    },
  };
}

function cell(view: SleepNightViewDto): WeeklyFitnessSleepNightCell {
  return { settled: true, view };
}

function fillStageNights(
  end: DayKey,
  count: number,
  deepMinutes: number,
): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(makeView(day, { deepMinutes, remMinutes: 100 + (i % 5) }));
  }
  return map;
}

describe("buildSleepStageAverageSummary — Deep 7d", () => {
  it("averages deep minutes at minimum 3/7", () => {
    const three: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { deepMinutes: 40 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { deepMinutes: 50 }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { deepMinutes: 60 }),
      ),
    };
    const ok = buildSleepStageAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: three,
      metricId: "deep_sleep",
    });
    expect(ok.validNightCount).toBe(SLEEP_STAGE_AVERAGE_7D_MIN_VALID);
    expect(ok.hasEnoughData).toBe(true);
    expect(ok.averageMinutes).toBe(50);
    expect(ok.displayValue).toBe("50m");
    expect(ok.hasEnoughPercentData).toBe(true);
    expect(ok.displayPercentValue).toMatch(/% of total sleep$/);
  });

  it("shows Not enough data below minimum and never substitutes 0m", () => {
    const two = {
      [selected]: cell(makeView(selected, { deepMinutes: 40 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { deepMinutes: 50 }),
      ),
    };
    const short = buildSleepStageAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: two,
      metricId: "deep_sleep",
    });
    expect(short.validNightCount).toBe(2);
    expect(short.hasEnoughData).toBe(false);
    expect(short.displayValue).toBe("Not enough data");
    expect(short.averageMinutes).toBeNull();
    expect(short.displayPercentValue).toBeNull();
  });

  it("excludes missing stage values and prior-night fallback", () => {
    const day = selected;
    const priorDay = addCalendarDaysToDayKey(day, -1);
    const missingStageDay = addCalendarDaysToDayKey(day, -2);
    const sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [day]: cell(makeView(day, { deepMinutes: 50 })),
      [priorDay]: {
        settled: true,
        view: {
          ...makeView(priorDay, { deepMinutes: 99 }),
          resolution: "latest_completed_prior_night",
          isFallback: true,
        },
      },
      [missingStageDay]: cell(
        makeView(missingStageDay, {
          deepMinutes: undefined as unknown as number,
        }),
      ),
    };
    // Fix missing stage: omit deepMinutes properly
    sleepNightByDay[missingStageDay] = cell({
      ...makeView(missingStageDay),
      sleepNight: {
        ...makeView(missingStageDay).sleepNight,
        deepMinutes: undefined,
        deepPercent: undefined,
      },
    });

    const s = buildSleepStageAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
      metricId: "deep_sleep",
    });
    expect(s.validNightCount).toBe(1);
    expect(s.hasEnoughData).toBe(false);
  });

  it("excludes future nights", () => {
    const future = addCalendarDaysToDayKey(selected, 1);
    const sleepNightByDay = {
      ...fillStageNights(selected, 3, 50),
      [future]: cell(makeView(future, { deepMinutes: 90 })),
    };
    const s = buildSleepStageAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
      metricId: "deep_sleep",
    });
    expect(s.validNightCount).toBe(3);
  });

  it("dedupes duplicate episode ids", () => {
    const d1 = selected;
    const d2 = addCalendarDaysToDayKey(selected, -1);
    const shared = makeView(d1, { deepMinutes: 40 });
    const sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [d1]: cell(shared),
      [d2]: cell({
        ...makeView(d2, { deepMinutes: 80 }),
        sleepNight: {
          ...makeView(d2, { deepMinutes: 80 }).sleepNight,
          sourceDocumentId: shared.sleepNight.sourceDocumentId,
        },
      }),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { deepMinutes: 60 }),
      ),
    };
    const s = buildSleepStageAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
      metricId: "deep_sleep",
    });
    // First occurrence wins; second day with same episode skipped → 2 nights
    expect(s.validNightCount).toBe(2);
  });
});

describe("buildSleepStageAverageSummaries — one history map serves Deep and REM", () => {
  it("computes Deep and REM 7/30/90 from the same night map", () => {
    const sleepNightByDay = fillStageNights(selected, 90, 52);
    const deep = buildSleepStageAverageSummaries({
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
      metricId: "deep_sleep",
    });
    const rem = buildSleepStageAverageSummaries({
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
      metricId: "rem_sleep",
    });
    expect(deep.sevenDay.hasEnoughData).toBe(true);
    expect(deep.thirtyDay.hasEnoughData).toBe(true);
    expect(deep.ninetyDay.hasEnoughData).toBe(true);
    expect(deep.ninetyDay.validNightCount).toBeGreaterThanOrEqual(SLEEP_STAGE_AVERAGE_90D_MIN_VALID);
    expect(deep.thirtyDay.validNightCount).toBeGreaterThanOrEqual(SLEEP_STAGE_AVERAGE_30D_MIN_VALID);
    expect(rem.sevenDay.hasEnoughData).toBe(true);
    expect(rem.ninetyDay.hasEnoughData).toBe(true);
    expect(deep.sevenDay.averageMinutes).not.toBe(rem.sevenDay.averageMinutes);
  });
});

describe("averagePercentFromStageSamples — arithmetic mean of per-night percents", () => {
  it("uses arithmetic mean of valid per-night percentages, not weighted sum", () => {
    // Night A: 50/500 = 10%; Night B: 50/250 = 20%
    // Arithmetic mean = 15%; weighted = 100/750 ≈ 13.3%
    const mean = averagePercentFromStageSamples([
      {
        calendarDay: selected,
        stageMinutes: 50,
        stagePercent: 10,
        sourceDocumentId: "a",
      },
      {
        calendarDay: addCalendarDaysToDayKey(selected, -1),
        stageMinutes: 50,
        stagePercent: 20,
        sourceDocumentId: "b",
      },
    ]);
    expect(mean).toBe(15);
  });

  it("excludes nights without valid percent from the mean", () => {
    const mean = averagePercentFromStageSamples([
      {
        calendarDay: selected,
        stageMinutes: 50,
        stagePercent: 10,
        sourceDocumentId: "a",
      },
      {
        calendarDay: addCalendarDaysToDayKey(selected, -1),
        stageMinutes: 50,
        stagePercent: null,
        sourceDocumentId: "b",
      },
    ]);
    expect(mean).toBe(10);
  });

  it("omits visible average percent when percent nights fall below sufficiency", () => {
    const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
    for (let i = 0; i < 3; i += 1) {
      const day = addCalendarDaysToDayKey(selected, -i);
      if (i === 0) {
        // Valid minutes + percent
        map[day] = cell(makeView(day, { deepMinutes: 50, totalSleepMinutes: 450 }));
      } else {
        // Valid minutes but no totalSleepMinutes → no percent
        map[day] = cell(
          makeView(day, {
            deepMinutes: 50,
            totalSleepMinutes: undefined as unknown as number,
            mainSleepMinutes: 450,
            deepPercent: undefined,
          }),
        );
        map[day] = {
          settled: true,
          view: {
            ...makeView(day),
            sleepNight: {
              ...makeView(day).sleepNight,
              deepMinutes: 50,
              totalSleepMinutes: undefined,
              mainSleepMinutes: 450,
              deepPercent: undefined,
            },
          },
        };
      }
    }
    const s = buildSleepStageAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: map,
      metricId: "deep_sleep",
    });
    expect(s.hasEnoughData).toBe(true);
    expect(s.validNightCount).toBe(3);
    expect(s.validPercentNightCount).toBe(1);
    expect(s.hasEnoughPercentData).toBe(false);
    expect(s.displayPercentValue).toBeNull();
  });
});
