import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  buildRestingHeartRateAverageSummaries,
  buildRestingHeartRateAverageSummary,
  collectCompletedAttributedRestingHeartRateNights,
  RESTING_HEART_RATE_AVERAGE_7D_MIN_VALID,
  RESTING_HEART_RATE_AVERAGE_30D_MIN_VALID,
  RESTING_HEART_RATE_AVERAGE_90D_MIN_VALID,
} from "@/lib/data/readiness/restingHeartRateAverages";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function makeView(
  day: DayKey,
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
      sourceDocumentId: `ep-${day}`,
      mainSleepMinutes: 450,
      totalSleepMinutes: 450,
      lowestHeartRateBpm: over.lowestHeartRateBpm ?? 50,
      isComplete: true,
      ...over,
    },
  };
}

function cell(view: SleepNightViewDto): WeeklyFitnessSleepNightCell {
  return { settled: true, view };
}

function fill(
  end: DayKey,
  count: number,
  bpm: number,
): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(makeView(day, { lowestHeartRateBpm: bpm }));
  }
  return map;
}

describe("buildRestingHeartRateAverageSummary", () => {
  it("averages bpm at 7d minimum 3", () => {
    const three: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { lowestHeartRateBpm: 48 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { lowestHeartRateBpm: 50 }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { lowestHeartRateBpm: 52 }),
      ),
    };
    const ok = buildRestingHeartRateAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: three,
    });
    expect(ok.validNightCount).toBe(RESTING_HEART_RATE_AVERAGE_7D_MIN_VALID);
    expect(ok.hasEnoughData).toBe(true);
    expect(ok.averageBpm).toBe(50);
    expect(ok.displayValue).toBe("50 bpm");
  });

  it("shows Not enough data below minimum and never substitutes 0 bpm", () => {
    const two = {
      [selected]: cell(makeView(selected, { lowestHeartRateBpm: 50 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { lowestHeartRateBpm: 52 }),
      ),
    };
    const summary = buildRestingHeartRateAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: two,
    });
    expect(summary.hasEnoughData).toBe(false);
    expect(summary.displayValue).toBe("Not enough data");
    expect(summary.averageBpm).toBeNull();
    expect(summary.displayValue).not.toBe("0 bpm");
  });

  it("excludes missing and invalid bpm nights", () => {
    const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { lowestHeartRateBpm: 50 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { lowestHeartRateBpm: undefined }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { lowestHeartRateBpm: 5 }),
      ),
      [addCalendarDaysToDayKey(selected, -3)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -3), { lowestHeartRateBpm: 52 }),
      ),
    };
    delete (map[addCalendarDaysToDayKey(selected, -1)]!.view!.sleepNight as {
      lowestHeartRateBpm?: number;
    }).lowestHeartRateBpm;

    const summary = buildRestingHeartRateAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: map,
    });
    expect(summary.validNightCount).toBe(2);
    expect(summary.hasEnoughData).toBe(false);
  });

  it("dedupes duplicate episodes and excludes future + prior-night fallback", () => {
    const priorDay = addCalendarDaysToDayKey(selected, -1);
    const future = addCalendarDaysToDayKey(selected, 1);
    const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { lowestHeartRateBpm: 50, sourceDocumentId: "same" })),
      [priorDay]: cell(
        makeView(priorDay, { lowestHeartRateBpm: 40, sourceDocumentId: "same" }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { lowestHeartRateBpm: 52 }),
      ),
      [addCalendarDaysToDayKey(selected, -3)]: {
        settled: true,
        view: {
          ...makeView(addCalendarDaysToDayKey(selected, -3), { lowestHeartRateBpm: 70 }),
          resolution: "latest_completed_prior_night",
          isFallback: true,
        },
      },
      [future]: cell(makeView(future, { lowestHeartRateBpm: 99 })),
    };
    const samples = collectCompletedAttributedRestingHeartRateNights({
      calendarDays: [
        selected,
        priorDay,
        addCalendarDaysToDayKey(selected, -2),
        addCalendarDaysToDayKey(selected, -3),
        future,
      ],
      todayDayKey: today,
      sleepNightByDay: map,
    });
    expect(samples).toHaveLength(2);
    expect(samples.map((s) => s.bpm).sort()).toEqual([50, 52]);
  });

  it("one 90-day map produces 7/30/90 with documented minimums", () => {
    const map = fill(selected, 40, 51);
    const summaries = buildRestingHeartRateAverageSummaries({
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: map,
    });
    expect(summaries.sevenDay.hasEnoughData).toBe(true);
    expect(summaries.thirtyDay.hasEnoughData).toBe(true);
    expect(summaries.ninetyDay.hasEnoughData).toBe(true);
    expect(summaries.sevenDay.minimumRequiredNightCount).toBe(RESTING_HEART_RATE_AVERAGE_7D_MIN_VALID);
    expect(summaries.thirtyDay.minimumRequiredNightCount).toBe(
      RESTING_HEART_RATE_AVERAGE_30D_MIN_VALID,
    );
    expect(summaries.ninetyDay.minimumRequiredNightCount).toBe(
      RESTING_HEART_RATE_AVERAGE_90D_MIN_VALID,
    );
    expect(summaries.ninetyDay.averageBpm).toBe(51);
    expect(summaries.sevenDay.coverageLabel).toMatch(/nights/);
  });
});
