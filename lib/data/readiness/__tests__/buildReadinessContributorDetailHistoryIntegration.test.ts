import { describe, expect, it } from "@jest/globals";

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";

import { buildReadinessContributorDetailViewModel } from "@/lib/data/readiness/buildReadinessContributorDetailViewModel";
import type { ReadinessContributorDayCell } from "@/lib/data/readiness/readinessContributorHistoryTypes";
import { READINESS_CONTRIBUTOR_DETAIL_METRICS } from "@/lib/data/readiness/readinessContributorDetailTypes";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;

function fillThirtyDays(): Partial<Record<DayKey, ReadinessContributorDayCell>> {
  const map: Partial<Record<DayKey, ReadinessContributorDayCell>> = {};
  for (let i = 0; i < 30; i += 1) {
    const day = addCalendarDaysToDayKey(selected, -(29 - i));
    const score = 70 + (i % 10);
    const row: OuraReadinessRangeDayDto = {
      day,
      score,
      source: "oura",
      contributors: {
        hrv_balance: score,
        body_temperature: score + 1,
        recovery_index: score + 2,
        sleep_balance: score - 1,
      },
    };
    map[day] = { settled: true, day: row };
  }
  return map;
}

describe("contributor history end-to-end view models", () => {
  it("populates 7/30/90 averages for all four metrics when ≥30 valid days exist", () => {
    const dayByDay = fillThirtyDays();
    for (const metric of READINESS_CONTRIBUTOR_DETAIL_METRICS) {
      const current =
        dayByDay[selected]?.day?.contributors?.[
          metric as keyof NonNullable<OuraReadinessRangeDayDto["contributors"]>
        ] ?? null;
      const vm = buildReadinessContributorDetailViewModel({
        metric,
        selectedDay: selected,
        todayDayKey: selected,
        currentScore: current,
        dayByDay,
        historyStatus: "ready",
      });
      expect(vm.pattern).not.toBeNull();
      expect(vm.pattern?.sevenDay.value).not.toBe("Not enough data");
      expect(vm.pattern?.thirtyDay.value).not.toBe("Not enough data");
      // 30 days is enough for 30d (>=10) but not 90d (>=30 of 90 window — only 30 present)
      // With only 30 filled days in the 90-day window, 90d should meet min 30.
      expect(vm.pattern?.ninetyDay.value).not.toBe("Not enough data");
      expect(vm.pattern?.sevenDay.statusLabel).toMatch(/Optimal|Good|Fair|Pay attention/);
      expect(vm.pattern?.thirtyDay.statusLabel).toMatch(/Optimal|Good|Fair|Pay attention/);
      expect(vm.pattern?.ninetyDay.statusLabel).toMatch(/Optimal|Good|Fair|Pay attention/);
      expect(vm.historyStatus).toBe("ready");
      expect(vm.canRetryHistory).toBe(false);
    }
  });

  it("shows retry/unavailable semantics rather than Not enough data when history errors", () => {
    for (const metric of READINESS_CONTRIBUTOR_DETAIL_METRICS) {
      const vm = buildReadinessContributorDetailViewModel({
        metric,
        selectedDay: selected,
        todayDayKey: selected,
        currentScore: 80,
        dayByDay: {},
        historyStatus: "error",
        historyErrorMessage: "Could not load readiness contributor history.",
      });
      expect(vm.pattern).toBeNull();
      expect(vm.canRetryHistory).toBe(true);
      expect(vm.currentFormatted).toBe("80");
      expect(vm.accessibilitySummary).toContain("Could not load recent contributor averages");
    }
  });
});
