import { describe, expect, it } from "@jest/globals";

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";

import {
  buildReadinessContributorDetailViewModel,
  resolveExactDayContributorScore,
} from "@/lib/data/readiness/buildReadinessContributorDetailViewModel";
import type { ReadinessContributorDayCell } from "@/lib/data/readiness/readinessContributorHistoryTypes";
import { READINESS_CONTRIBUTOR_DETAIL_METRICS } from "@/lib/data/readiness/readinessContributorDetailTypes";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function rangeDay(
  day: DayKey,
  over: Partial<OuraReadinessRangeDayDto> = {},
): OuraReadinessRangeDayDto {
  return {
    day,
    score: 80,
    source: "oura",
    contributors: {
      hrv_balance: 82,
      body_temperature: 91,
      recovery_index: 90,
      sleep_balance: 78,
    },
    ...over,
  };
}

function cell(day: OuraReadinessRangeDayDto | undefined): ReadinessContributorDayCell {
  if (day == null) return { settled: true };
  return { settled: true, day };
}

function fillAll(
  end: DayKey,
  count: number,
  score: number,
): Partial<Record<DayKey, ReadinessContributorDayCell>> {
  const map: Partial<Record<DayKey, ReadinessContributorDayCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(
      rangeDay(day, {
        contributors: {
          hrv_balance: score,
          body_temperature: score,
          recovery_index: score,
          sleep_balance: score,
        },
      }),
    );
  }
  return map;
}

describe("buildReadinessContributorDetailViewModel", () => {
  for (const metric of READINESS_CONTRIBUTOR_DETAIL_METRICS) {
    describe(metric, () => {
      it("ready state shows score, classification, score bar, and patterns", () => {
        const dayByDay = fillAll(selected, 30, 82);
        const vm = buildReadinessContributorDetailViewModel({
          metric,
          selectedDay: selected,
          todayDayKey: today,
          currentScore: 82.4,
          dayByDay,
          historyStatus: "ready",
        });
        expect(vm.currentPresence).toBe("present");
        expect(vm.currentScore).toBe(82.4);
        expect(vm.currentDisplayScore).toBe(82);
        expect(vm.currentFormatted).toBe("82");
        expect(vm.currentClassification).toBe("Good");
        expect(vm.statusSentence).toBe("Good");
        expect(vm.supportingLabel).toBe("Oura contributor score");
        expect(vm.scoreBar).not.toBeNull();
        expect(vm.scoreBar?.currentMarkerPosition01).toBeCloseTo(0.824);
        expect(vm.pattern?.sevenDay.value).toBe("82");
        expect(vm.pattern?.sevenDay.statusLabel).toBe("Good");
        expect(vm.pattern?.thirtyDay.value).toBe("82");
        expect(vm.accessibilitySummary).toContain("82 out of 100");
        expect(vm.accessibilitySummary).toContain("Oura contributor score");
        expect(vm.accessibilitySummary).not.toMatch(/\bms\b|°C|°F|fever|Healthy range/i);
      });

      it("loading history keeps hero and shows loading pattern flag", () => {
        const vm = buildReadinessContributorDetailViewModel({
          metric,
          selectedDay: selected,
          todayDayKey: today,
          currentScore: 91,
          dayByDay: {},
          historyStatus: "loading",
        });
        expect(vm.currentFormatted).toBe("91");
        expect(vm.scoreBar).not.toBeNull();
        expect(vm.pattern).toBeNull();
        expect(vm.isHistoryLoading).toBe(true);
        expect(vm.accessibilitySummary).toContain("Loading recent contributor averages");
      });

      it("error keeps current result and enables retry", () => {
        const vm = buildReadinessContributorDetailViewModel({
          metric,
          selectedDay: selected,
          todayDayKey: today,
          currentScore: 70,
          dayByDay: {},
          historyStatus: "error",
          historyErrorMessage: "Could not load recent averages.",
        });
        expect(vm.currentClassification).toBe("Good");
        expect(vm.canRetryHistory).toBe(true);
        expect(vm.pattern).toBeNull();
      });

      it("insufficient history shows Not enough data without classification", () => {
        const dayByDay: Partial<Record<DayKey, ReadinessContributorDayCell>> = {
          [selected]: cell(
            rangeDay(selected, {
              contributors: { [metric]: 80 },
            }),
          ),
          [addCalendarDaysToDayKey(selected, -1)]: cell(
            rangeDay(addCalendarDaysToDayKey(selected, -1), {
              contributors: { [metric]: 81 },
            }),
          ),
        };
        const vm = buildReadinessContributorDetailViewModel({
          metric,
          selectedDay: selected,
          todayDayKey: today,
          currentScore: 80,
          dayByDay,
          historyStatus: "ready",
        });
        expect(vm.pattern?.sevenDay.value).toBe("Not enough data");
        expect(vm.pattern?.sevenDay.statusLabel).toBeNull();
        expect(vm.pattern?.thirtyDay.value).toBe("Not enough data");
        expect(vm.pattern?.ninetyDay.value).toBe("Not enough data");
      });

      it("missing current score is unavailable without score bar or history pattern", () => {
        const vm = buildReadinessContributorDetailViewModel({
          metric,
          selectedDay: selected,
          todayDayKey: today,
          currentScore: null,
          dayByDay: fillAll(selected, 30, 80),
          historyStatus: "ready",
        });
        expect(vm.currentPresence).toBe("absent");
        expect(vm.currentFormatted).toBe("Not available");
        expect(vm.currentClassification).toBeNull();
        expect(vm.scoreBar).toBeNull();
        expect(vm.pattern).toBeNull();
        expect(vm.accessibilitySummary).toContain("Not available");
        expect(vm.accessibilitySummary).not.toMatch(/\b0 out of 100\b/);
      });
    });
  }

  it("never substitutes overall readiness, wrong keys, ratios, or zero for missing", () => {
    expect(
      resolveExactDayContributorScore({
        metric: "hrv_balance",
        contributors: { score: 99, overall: 99, hrv: 40 },
      }),
    ).toBeNull();
    expect(
      resolveExactDayContributorScore({
        metric: "hrv_balance",
        contributors: { hrv_balance: 0.82 },
      }),
    ).toBe(0.82); // validated literal score — not converted to 82
    expect(
      resolveExactDayContributorScore({
        metric: "body_temperature",
        contributors: { temperature_deviation: 0.3, body_temperature: 91 },
      }),
    ).toBe(91);
    expect(
      resolveExactDayContributorScore({
        metric: "hrv_balance",
        contributors: { hrv_balance: "82" },
      }),
    ).toBeNull();
    expect(
      resolveExactDayContributorScore({
        metric: "recovery_index",
        contributors: { recovery_index: 0 },
      }),
    ).toBe(0);
  });

  it("preserves unrounded internal score and rounds only for display", () => {
    const vm = buildReadinessContributorDetailViewModel({
      metric: "sleep_balance",
      selectedDay: selected,
      todayDayKey: today,
      currentScore: 78.6,
      dayByDay: {},
      historyStatus: "loading",
    });
    expect(vm.currentScore).toBe(78.6);
    expect(vm.currentDisplayScore).toBe(79);
    expect(vm.currentFormatted).toBe("79");
  });

  it("metric-specific titles and copy avoid physiology confusion", () => {
    const hrv = buildReadinessContributorDetailViewModel({
      metric: "hrv_balance",
      selectedDay: selected,
      todayDayKey: today,
      currentScore: 82,
      dayByDay: {},
      historyStatus: "idle",
    });
    expect(hrv.title).toBe("HRV Balance");
    expect(hrv.dataAccuracyBody).toMatch(/not a raw HRV measurement in milliseconds/);

    const body = buildReadinessContributorDetailViewModel({
      metric: "body_temperature",
      selectedDay: selected,
      todayDayKey: today,
      currentScore: 91,
      dayByDay: {},
      historyStatus: "idle",
    });
    expect(body.title).toBe("Body Temperature");
    expect(body.dataAccuracyBody).not.toMatch(/°C|°F/);
    expect(body.explainers.map((e) => e.body).join(" ")).toMatch(/not the same as an oral/);

    const sleep = buildReadinessContributorDetailViewModel({
      metric: "sleep_balance",
      selectedDay: selected,
      todayDayKey: today,
      currentScore: 78,
      dayByDay: {},
      historyStatus: "idle",
    });
    expect(sleep.explainers.map((e) => e.body).join(" ")).toMatch(/distinct from the Sleep Duration/);
  });
});
