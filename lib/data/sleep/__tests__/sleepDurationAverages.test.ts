import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import {
  buildSleepDurationAverageSummary,
  SLEEP_DURATION_AVERAGE_30D_MIN_VALID,
  SLEEP_DURATION_AVERAGE_7D_MIN_VALID,
} from "@/lib/data/sleep/sleepDurationAverages";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function makeView(
  day: DayKey,
  minutes: number,
  id: string,
  over: Partial<SleepNightViewDto["sleepNight"]> = {},
): SleepNightViewDto {
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
      sourceDocumentId: id,
      mainSleepMinutes: minutes,
      isComplete: true,
      ...over,
    },
  };
}

function cell(view: SleepNightViewDto): WeeklyFitnessSleepNightCell {
  return { settled: true, view };
}

function fillNights(
  end: DayKey,
  count: number,
  minutes: number,
): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(makeView(day, minutes, `ep-${day}`));
  }
  return map;
}

describe("buildSleepDurationAverageSummary — 7d", () => {
  it("shows average for 7/7 nights", () => {
    const sleepNightByDay = fillNights(selected, 7, 420);
    const s = buildSleepDurationAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
    });
    expect(s.validNightCount).toBe(7);
    expect(s.expectedNightCount).toBe(7);
    expect(s.hasEnoughData).toBe(true);
    expect(s.displayValue).toBe("7h");
    expect(s.coverageLabel).toBe("7 of 7 nights");
  });

  it("shows average at minimum 3/7 and Not enough data at 2/7", () => {
    const three: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, 400, "a")),
      [addCalendarDaysToDayKey(selected, -1)]: cell(makeView(addCalendarDaysToDayKey(selected, -1), 420, "b")),
      [addCalendarDaysToDayKey(selected, -2)]: cell(makeView(addCalendarDaysToDayKey(selected, -2), 440, "c")),
    };
    const ok = buildSleepDurationAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: three,
    });
    expect(ok.validNightCount).toBe(SLEEP_DURATION_AVERAGE_7D_MIN_VALID);
    expect(ok.hasEnoughData).toBe(true);
    expect(ok.displayValue).not.toBe("Not enough data");

    const two = {
      [selected]: three[selected]!,
      [addCalendarDaysToDayKey(selected, -1)]: three[addCalendarDaysToDayKey(selected, -1)]!,
    };
    const short = buildSleepDurationAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: two,
    });
    expect(short.validNightCount).toBe(2);
    expect(short.hasEnoughData).toBe(false);
    expect(short.displayValue).toBe("Not enough data");
    expect(short.averageMinutes).toBeNull();
    expect(short.coverageLabel).toBe("2 of 7 nights");
  });

  it("excludes missing nights as zero and prefers mainSleepMinutes", () => {
    const day = selected;
    const sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [day]: cell(
        makeView(day, 500, "main", { mainSleepMinutes: 500, totalSleepMinutes: 600 }),
      ),
      [addCalendarDaysToDayKey(day, -1)]: cell(
        makeView(addCalendarDaysToDayKey(day, -1), 400, "total-only", {
          mainSleepMinutes: undefined,
          totalSleepMinutes: 400,
        }),
      ),
      [addCalendarDaysToDayKey(day, -2)]: cell(
        makeView(addCalendarDaysToDayKey(day, -2), 420, "malformed", {
          mainSleepMinutes: 0,
          totalSleepMinutes: 0,
          isComplete: true,
        }),
      ),
    };
    // Force incomplete / zero duration exclusion via collector rules
    sleepNightByDay[addCalendarDaysToDayKey(day, -2)] = {
      settled: true,
      view: makeView(addCalendarDaysToDayKey(day, -2), 0, "zero", {
        mainSleepMinutes: 0,
        totalSleepMinutes: 0,
      }),
    };

    const s = buildSleepDurationAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
    });
    expect(s.validNightCount).toBe(2);
    expect(s.hasEnoughData).toBe(false);
    expect(s.coverageLabel).toBe("2 of 7 nights");
  });

  it("dedupes duplicate episodes and ignores prior-night fallback", () => {
    const d0 = selected;
    const d1 = addCalendarDaysToDayKey(selected, -1);
    const shared = makeView(d0, 420, "same-episode");
    const prior: SleepNightViewDto = {
      ...makeView(d1, 500, "prior"),
      resolution: "latest_completed_prior_night",
    };
    const sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [d0]: cell(shared),
      [d1]: { settled: true, view: prior },
      [addCalendarDaysToDayKey(selected, -2)]: {
        settled: true,
        view: { ...shared, requestedDay: addCalendarDaysToDayKey(selected, -2), anchorDay: addCalendarDaysToDayKey(selected, -2) },
      },
    };
    const s = buildSleepDurationAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
    });
    // prior-night excluded; duplicate sourceDocumentId excluded → 1 valid
    expect(s.validNightCount).toBe(1);
    expect(s.expectedNightCount).toBe(7);
  });

  it("includes selected day and excludes future days", () => {
    const future = addCalendarDaysToDayKey(selected, 1);
    const sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, 420, "today")),
      [future]: cell(makeView(future, 600, "future")),
    };
    const s = buildSleepDurationAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay,
    });
    expect(s.validNightCount).toBe(1);
  });
});

describe("buildSleepDurationAverageSummary — 30d", () => {
  it("shows at 10/30 and Not enough data at 9/30", () => {
    const ten = fillNights(selected, SLEEP_DURATION_AVERAGE_30D_MIN_VALID, 450);
    const ok = buildSleepDurationAverageSummary({
      window: "30d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: ten,
    });
    expect(ok.validNightCount).toBe(10);
    expect(ok.hasEnoughData).toBe(true);
    expect(ok.expectedNightCount).toBe(30);

    const nineDays = Object.keys(ten).slice(0, 9) as DayKey[];
    const nine: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
    for (const d of nineDays) nine[d] = ten[d]!;
    const short = buildSleepDurationAverageSummary({
      window: "30d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: nine,
    });
    expect(short.validNightCount).toBe(9);
    expect(short.hasEnoughData).toBe(false);
    expect(short.displayValue).toBe("Not enough data");
  });

  it("shows average for 30/30", () => {
    const all = fillNights(selected, 30, 480);
    const s = buildSleepDurationAverageSummary({
      window: "30d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: all,
    });
    expect(s.validNightCount).toBe(30);
    expect(s.hasEnoughData).toBe(true);
    expect(s.displayValue).toBe("8h");
  });
});
