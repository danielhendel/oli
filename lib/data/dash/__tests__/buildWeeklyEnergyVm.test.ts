import { describe, expect, it } from "@jest/globals";

import {
  buildWeeklyEnergyVm,
  computeWeeklyEnergyChartScale,
} from "@/lib/data/dash/buildWeeklyEnergyVm";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("buildWeeklyEnergyVm", () => {
  const week: DayKey[] = [
    "2026-05-17",
    "2026-05-18",
    "2026-05-19",
    "2026-05-20",
    "2026-05-21",
    "2026-05-22",
    "2026-05-23",
  ] as DayKey[];
  const today = "2026-05-20" as DayKey;
  const sun = "2026-05-17" as DayKey;
  const mon = "2026-05-18" as DayKey;

  const energyCell = (low: number, high: number) => ({
    settled: true as const,
    energy: {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-20T12:00:00.000Z",
      day: today,
      estimatedKcal: { low, high, midpoint: (low + high) / 2 },
      variancePct: 0.08,
      confidence: "moderate" as const,
      factors: {},
      missingRequiredInputs: [],
    },
  });

  it("weekly average uses only present days and formats with commas and kcal", () => {
    const vm = buildWeeklyEnergyVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      energyByDay: {
        [sun]: energyCell(2521, 3107),
        [mon]: energyCell(2400, 2900),
      },
    });
    expect(vm.isEmpty).toBe(false);
    expect(vm.weeklyAverageRangeText).toBe("2,461–3,004 kcal");
    expect(vm.weeklyAverageQualifier).toBe("avg / day");
  });

  it("includes seven chart day slots with null ranges for missing nights", () => {
    const vm = buildWeeklyEnergyVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      energyByDay: {
        [mon]: energyCell(2000, 2500),
      },
    });
    expect(vm.chartPoints).toHaveLength(7);
    const monPt = vm.chartPoints.find((p) => p.dayKey === mon);
    expect(monPt?.low).toBe(2000);
    expect(monPt?.high).toBe(2500);
    const tue = vm.chartPoints.find((p) => p.dayKey === "2026-05-19");
    expect(tue?.low).toBeNull();
    expect(tue?.high).toBeNull();
  });

  it("future days have null low/high and isFutureDay true", () => {
    const vm = buildWeeklyEnergyVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      energyByDay: {
        [mon]: energyCell(2000, 2500),
      },
    });
    const future = vm.chartPoints.find((p) => p.dayKey === "2026-05-21");
    expect(future?.isFutureDay).toBe(true);
    expect(future?.low).toBeNull();
    expect(future?.high).toBeNull();
  });

  it("isEmpty when no day has energy", () => {
    const vm = buildWeeklyEnergyVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      energyByDay: {},
    });
    expect(vm.isEmpty).toBe(true);
    expect(vm.weeklyAverageRangeText).toBeNull();
  });
});

describe("computeWeeklyEnergyChartScale", () => {
  it("returns sensible min/max for range columns", () => {
    const scale = computeWeeklyEnergyChartScale([
      { low: 2521, high: 3107 },
      { low: 2400, high: 2900 },
    ]);
    expect(scale.chartMin).toBeLessThanOrEqual(2521);
    expect(scale.chartMax).toBeGreaterThanOrEqual(3107);
  });
});
