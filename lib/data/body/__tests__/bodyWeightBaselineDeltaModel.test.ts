import { buildBodyWeightBaselineDeltaModel } from "@/lib/data/body/bodyWeightBaselineDeltaModel";
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";

const TODAY = "2026-03-31";

function s(dayKey: string, weightKg: number): BodyWeightSample {
  return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
}

const DATASET: BodyWeightSample[] = [
  s("2025-06-01", 78),
  s("2026-01-15", 79),
  s("2026-03-05", 79),
  s("2026-03-25", 81),
  s("2026-03-31", 80),
];

function rowMap(samples: BodyWeightSample[]) {
  const m = buildBodyWeightBaselineDeltaModel({ todayDayKey: TODAY, samples, unit: "lb" });
  return Object.fromEntries(m.rows.map((r) => [r.key, r]));
}

describe("buildBodyWeightBaselineDeltaModel", () => {
  it("emits exactly the five periods in order", () => {
    const m = buildBodyWeightBaselineDeltaModel({ todayDayKey: TODAY, samples: DATASET, unit: "lb" });
    expect(m.rows.map((r) => r.key)).toEqual(["7d", "30d", "90d", "ytd", "12m"]);
    expect(m.rows.map((r) => r.label)).toEqual(["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]);
  });

  it("computes signed deltas as latest minus first reading within each window (vs period start)", () => {
    const r = rowMap(DATASET);
    // 7d: 03-25 (81) -> 03-31 (80) = -1 kg
    expect(r["7d"]!.deltaLabel).toBe("-2.2 lb");
    // 30d: 03-05 (79) -> 03-31 (80) = +1 kg
    expect(r["30d"]!.deltaLabel).toBe("+2.2 lb");
    // 90d: 01-15 (79) -> 03-31 (80) = +1 kg
    expect(r["90d"]!.deltaLabel).toBe("+2.2 lb");
    // YTD: 01-15 (79) -> 03-31 (80) = +1 kg
    expect(r["ytd"]!.deltaLabel).toBe("+2.2 lb");
    // 12m: 06-01 (78) -> 03-31 (80) = +2 kg
    expect(r["12m"]!.deltaLabel).toBe("+4.4 lb");
    for (const row of Object.values(r)) {
      expect(row.hasData).toBe(true);
    }
  });

  it("renders 'Not enough data' for periods with fewer than two measured days", () => {
    const m = buildBodyWeightBaselineDeltaModel({
      todayDayKey: TODAY,
      samples: [s("2026-03-30", 80)],
      unit: "lb",
    });
    for (const row of m.rows) {
      expect(row.hasData).toBe(false);
      expect(row.deltaLabel).toBeNull();
      expect(row.accessibilityLabel).toContain("Not enough data");
    }
  });

  it("treats an empty sample set as insufficient for all periods", () => {
    const m = buildBodyWeightBaselineDeltaModel({ todayDayKey: TODAY, samples: [], unit: "lb" });
    expect(m.rows.every((row) => row.hasData === false)).toBe(true);
  });

  it("supports kg units", () => {
    const m = buildBodyWeightBaselineDeltaModel({ todayDayKey: TODAY, samples: DATASET, unit: "kg" });
    const seven = m.rows.find((r) => r.key === "7d")!;
    expect(seven.deltaLabel).toBe("-1.0 kg");
  });
});
