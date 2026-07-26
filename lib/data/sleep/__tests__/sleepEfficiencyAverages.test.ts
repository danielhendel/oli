import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  buildSleepEfficiencyAverageSummaries,
  buildSleepEfficiencyAverageSummary,
  SLEEP_EFFICIENCY_AVERAGE_7D_MIN_VALID,
  SLEEP_EFFICIENCY_AVERAGE_30D_MIN_VALID,
  SLEEP_EFFICIENCY_AVERAGE_90D_MIN_VALID,
} from "@/lib/data/sleep/sleepEfficiencyAverages";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function makeView(
  day: DayKey,
  over: Partial<SleepNightViewDto["sleepNight"]> & { efficiency?: number } = {},
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
      efficiency: over.efficiency ?? 90,
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
  efficiency: number,
): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(makeView(day, { efficiency }));
  }
  return map;
}

describe("buildSleepEfficiencyAverageSummary", () => {
  it("averages efficiency at 7d minimum 3", () => {
    const three: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { efficiency: 90 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { efficiency: 92 }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { efficiency: 88 }),
      ),
    };
    const ok = buildSleepEfficiencyAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: three,
    });
    expect(ok.validNightCount).toBe(SLEEP_EFFICIENCY_AVERAGE_7D_MIN_VALID);
    expect(ok.hasEnoughData).toBe(true);
    expect(ok.averagePercent).toBe(90);
    expect(ok.displayValue).toBe("90%");
  });

  it("shows Not enough data below minimum and never substitutes 0%", () => {
    const two = {
      [selected]: cell(makeView(selected, { efficiency: 90 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { efficiency: 92 }),
      ),
    };
    const summary = buildSleepEfficiencyAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: two,
    });
    expect(summary.hasEnoughData).toBe(false);
    expect(summary.displayValue).toBe("Not enough data");
    expect(summary.averagePercent).toBeNull();
    expect(summary.displayValue).not.toBe("0%");
  });

  it("excludes missing and invalid efficiency nights", () => {
    const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { efficiency: 90 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { efficiency: undefined }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { efficiency: 101 }),
      ),
      [addCalendarDaysToDayKey(selected, -3)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -3), { efficiency: 88 }),
      ),
    };
    // Also strip efficiency to truly missing via omit
    delete (map[addCalendarDaysToDayKey(selected, -1)]!.view!.sleepNight as { efficiency?: number })
      .efficiency;

    const summary = buildSleepEfficiencyAverageSummary({
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
      [selected]: cell(makeView(selected, { efficiency: 90, sourceDocumentId: "same" })),
      [priorDay]: cell(
        makeView(priorDay, { efficiency: 80, sourceDocumentId: "same" }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { efficiency: 88 }),
      ),
      [addCalendarDaysToDayKey(selected, -3)]: {
        settled: true,
        view: {
          ...makeView(addCalendarDaysToDayKey(selected, -3), { efficiency: 70 }),
          resolution: "latest_completed_prior_night",
          isFallback: true,
        },
      },
      [future]: cell(makeView(future, { efficiency: 99 })),
    };
    const summary = buildSleepEfficiencyAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: map,
    });
    expect(summary.validNightCount).toBe(2);
    expect(summary.hasEnoughData).toBe(false);
  });

  it("enforces 30d and 90d minimums from one 90-day map", () => {
    const map = fill(selected, 90, 91);
    const all = buildSleepEfficiencyAverageSummaries({
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: map,
    });
    expect(all.sevenDay.hasEnoughData).toBe(true);
    expect(all.thirtyDay.hasEnoughData).toBe(true);
    expect(all.ninetyDay.hasEnoughData).toBe(true);
    expect(all.sevenDay.validNightCount).toBe(7);
    expect(all.thirtyDay.validNightCount).toBe(30);
    expect(all.ninetyDay.validNightCount).toBe(90);
    expect(all.thirtyDay.minimumRequiredNightCount).toBe(
      SLEEP_EFFICIENCY_AVERAGE_30D_MIN_VALID,
    );
    expect(all.ninetyDay.minimumRequiredNightCount).toBe(
      SLEEP_EFFICIENCY_AVERAGE_90D_MIN_VALID,
    );
    expect(all.ninetyDay.displayValue).toBe("91%");
  });

  it("normalizes 0–1 ratio nights into the average", () => {
    const three: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: cell(makeView(selected, { efficiency: 0.9 })),
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -1), { efficiency: 0.92 }),
      ),
      [addCalendarDaysToDayKey(selected, -2)]: cell(
        makeView(addCalendarDaysToDayKey(selected, -2), { efficiency: 0.88 }),
      ),
    };
    const ok = buildSleepEfficiencyAverageSummary({
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      sleepNightByDay: three,
    });
    expect(ok.averagePercent).toBe(90);
    expect(ok.displayValue).toBe("90%");
  });
});
