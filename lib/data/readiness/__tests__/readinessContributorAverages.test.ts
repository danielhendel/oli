import { describe, expect, it } from "@jest/globals";

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";
import type { ReadinessRangeContributorKey } from "@oli/contracts/ouraVendor";

import {
  buildReadinessContributorAverageSummaries,
  buildReadinessContributorAverageSummary,
  READINESS_CONTRIBUTOR_AVERAGE_7D_MIN_VALID,
  READINESS_CONTRIBUTOR_AVERAGE_30D_MIN_VALID,
  READINESS_CONTRIBUTOR_AVERAGE_90D_MIN_VALID,
} from "@/lib/data/readiness/readinessContributorAverages";
import type { ReadinessContributorDayCell } from "@/lib/data/readiness/readinessContributorHistoryTypes";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;
const KEYS: ReadinessRangeContributorKey[] = [
  "hrv_balance",
  "body_temperature",
  "recovery_index",
  "sleep_balance",
];

function rangeDay(
  day: DayKey,
  score: number | null,
  key: ReadinessRangeContributorKey = "hrv_balance",
): OuraReadinessRangeDayDto {
  return {
    day,
    score: 80,
    source: "oura",
    ...(score != null
      ? { contributors: { [key]: score } }
      : { contributors: {} }),
  };
}

function cell(day: OuraReadinessRangeDayDto | undefined): ReadinessContributorDayCell {
  if (day == null) return { settled: true };
  return { settled: true, day };
}

function fill(
  end: DayKey,
  count: number,
  score: number,
  key: ReadinessRangeContributorKey = "hrv_balance",
): Partial<Record<DayKey, ReadinessContributorDayCell>> {
  const map: Partial<Record<DayKey, ReadinessContributorDayCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(rangeDay(day, score, key));
  }
  return map;
}

describe("readinessContributorAverages", () => {
  for (const contributorKey of KEYS) {
    describe(contributorKey, () => {
      it("averages at 7d minimum 3 without rounding before mean", () => {
        const three: Partial<Record<DayKey, ReadinessContributorDayCell>> = {
          [selected]: cell(rangeDay(selected, 84.99, contributorKey)),
          [addCalendarDaysToDayKey(selected, -1)]: cell(
            rangeDay(addCalendarDaysToDayKey(selected, -1), 85.01, contributorKey),
          ),
          [addCalendarDaysToDayKey(selected, -2)]: cell(
            rangeDay(addCalendarDaysToDayKey(selected, -2), 90, contributorKey),
          ),
        };
        const ok = buildReadinessContributorAverageSummary({
          contributorKey,
          window: "7d",
          selectedDay: selected,
          todayDayKey: today,
          dayByDay: three,
        });
        expect(ok.validDayCount).toBe(READINESS_CONTRIBUTOR_AVERAGE_7D_MIN_VALID);
        expect(ok.hasEnoughData).toBe(true);
        expect(ok.averageScore).toBeCloseTo((84.99 + 85.01 + 90) / 3, 10);
        expect(ok.selectedDayScore).toBe(84.99);
      });

      it("returns insufficient explicitly and never substitutes zero", () => {
        const two = {
          [selected]: cell(rangeDay(selected, 50, contributorKey)),
          [addCalendarDaysToDayKey(selected, -1)]: cell(
            rangeDay(addCalendarDaysToDayKey(selected, -1), 60, contributorKey),
          ),
        };
        const summary = buildReadinessContributorAverageSummary({
          contributorKey,
          window: "7d",
          selectedDay: selected,
          todayDayKey: today,
          dayByDay: two,
        });
        expect(summary.hasEnoughData).toBe(false);
        expect(summary.averageScore).toBeNull();
        expect(summary.validDayCount).toBe(2);
        expect(summary.selectedDayScore).toBe(50);
      });
    });
  }

  it("excludes missing, invalid, future, and day-mismatch rows", () => {
    const future = addCalendarDaysToDayKey(selected, 1);
    const map: Partial<Record<DayKey, ReadinessContributorDayCell>> = {
      [selected]: cell(rangeDay(selected, 70)),
      [addCalendarDaysToDayKey(selected, -1)]: cell(rangeDay(addCalendarDaysToDayKey(selected, -1), null)),
      [addCalendarDaysToDayKey(selected, -2)]: {
        settled: true,
        day: {
          day: addCalendarDaysToDayKey(selected, -9),
          score: 80,
          source: "oura",
          contributors: { hrv_balance: 99 },
        },
      },
      [future]: cell(rangeDay(future, 100)),
    };
    const summary = buildReadinessContributorAverageSummary({
      contributorKey: "hrv_balance",
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      dayByDay: map,
    });
    expect(summary.validDayCount).toBe(1);
    expect(summary.hasEnoughData).toBe(false);
    expect(summary.averageScore).toBeNull();
  });

  it("dedupes duplicate calendar days (one sample per day)", () => {
    // Map key collision naturally dedupes; collector also guards seenDays.
    const map = fill(selected, 3, 80);
    const samples = buildReadinessContributorAverageSummary({
      contributorKey: "hrv_balance",
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      dayByDay: map,
    });
    expect(samples.validDayCount).toBe(3);
  });

  it("builds 7/30/90 summaries with 3/10/30 minima from one map", () => {
    const map30 = fill(selected, 30, 60, "recovery_index");
    const all = buildReadinessContributorAverageSummaries({
      contributorKey: "recovery_index",
      selectedDay: selected,
      todayDayKey: today,
      dayByDay: map30,
    });
    expect(all.sevenDay.hasEnoughData).toBe(true);
    expect(all.sevenDay.validDayCount).toBe(7);
    expect(all.sevenDay.minimumRequiredDayCount).toBe(READINESS_CONTRIBUTOR_AVERAGE_7D_MIN_VALID);
    expect(all.thirtyDay.hasEnoughData).toBe(true);
    expect(all.thirtyDay.validDayCount).toBe(30);
    expect(all.thirtyDay.minimumRequiredDayCount).toBe(READINESS_CONTRIBUTOR_AVERAGE_30D_MIN_VALID);
    expect(all.ninetyDay.hasEnoughData).toBe(true);
    expect(all.ninetyDay.validDayCount).toBe(30);
    expect(all.ninetyDay.minimumRequiredDayCount).toBe(READINESS_CONTRIBUTOR_AVERAGE_90D_MIN_VALID);
    expect(all.ninetyDay.averageScore).toBe(60);

    const map29 = fill(selected, 29, 60, "recovery_index");
    const short90 = buildReadinessContributorAverageSummary({
      contributorKey: "recovery_index",
      window: "90d",
      selectedDay: selected,
      todayDayKey: today,
      dayByDay: map29,
    });
    expect(short90.hasEnoughData).toBe(false);
    expect(short90.validDayCount).toBe(29);
    expect(short90.averageScore).toBeNull();
  });

  it("selected-day current value is null when missing", () => {
    const map = {
      [addCalendarDaysToDayKey(selected, -1)]: cell(
        rangeDay(addCalendarDaysToDayKey(selected, -1), 70),
      ),
    };
    const summary = buildReadinessContributorAverageSummary({
      contributorKey: "sleep_balance",
      window: "7d",
      selectedDay: selected,
      todayDayKey: today,
      dayByDay: map,
    });
    expect(summary.selectedDayScore).toBeNull();
  });
});
