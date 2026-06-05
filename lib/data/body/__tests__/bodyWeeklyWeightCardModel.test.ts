import {
  BODY_THIS_WEEK_CHART_DAY_LABELS,
  buildBodyWeeklyWeightCardModel,
} from "@/lib/data/body/bodyWeeklyWeightCardModel";
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";

const WEEK = [
  "2026-03-29", // Sun
  "2026-03-30", // Mon
  "2026-03-31", // Tue (today)
  "2026-04-01", // Wed (future)
  "2026-04-02", // Thu (future)
  "2026-04-03", // Fri (future)
  "2026-04-04", // Sat (future)
] as const;
const TODAY = "2026-03-31";

function s(dayKey: string, weightKg: number, observedAt = `${dayKey}T08:00:00.000Z`): BodyWeightSample {
  return { dayKey, observedAt, weightKg };
}

describe("buildBodyWeeklyWeightCardModel", () => {
  it("emits seven Sun→Sat points with labels, skipping missing days and flagging future days", () => {
    const m = buildBodyWeeklyWeightCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK,
      samples: [s("2026-03-29", 78), s("2026-03-31", 80)],
      unit: "lb",
    });
    expect(m.chartPoints).toHaveLength(7);
    expect(m.chartPoints.map((p) => p.displayLabel)).toEqual([...BODY_THIS_WEEK_CHART_DAY_LABELS]);
    // Sun has a reading, Mon is missing, Tue has a reading
    expect(m.chartPoints[0]!.weightKg).toBe(78);
    expect(m.chartPoints[1]!.weightKg).toBeNull();
    expect(m.chartPoints[2]!.weightKg).toBe(80);
    // Wed..Sat are future
    for (const i of [3, 4, 5, 6]) {
      expect(m.chartPoints[i]!.isFutureDay).toBe(true);
      expect(m.chartPoints[i]!.weightKg).toBeNull();
    }
  });

  it("computes the weekly average over available days only", () => {
    const m = buildBodyWeeklyWeightCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK,
      samples: [s("2026-03-29", 78), s("2026-03-31", 80)],
      unit: "lb",
    });
    expect(m.measuredDayCount).toBe(2);
    expect(m.weeklyAverageKg).toBeCloseTo(79, 6);
    // 79 kg -> 174.2 lb
    expect(m.weeklyAverageMetricValue).toBe("174.2");
    expect(m.isEmpty).toBe(false);
  });

  it("uses the latest reading (by observedAt) when a day has multiple samples", () => {
    const m = buildBodyWeeklyWeightCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK,
      samples: [
        s("2026-03-31", 80, "2026-03-31T06:00:00.000Z"),
        s("2026-03-31", 81, "2026-03-31T20:00:00.000Z"),
      ],
      unit: "kg",
    });
    expect(m.chartPoints[2]!.weightKg).toBe(81);
  });

  it("reports an empty week when no day has a reading", () => {
    const m = buildBodyWeeklyWeightCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK,
      samples: [],
      unit: "lb",
    });
    expect(m.isEmpty).toBe(true);
    expect(m.weeklyAverageKg).toBeNull();
    expect(m.weeklyAverageMetricValue).toBeNull();
    expect(m.chartPoints).toHaveLength(7);
  });

  it("never plots a future day even if a stray sample exists for it", () => {
    const m = buildBodyWeeklyWeightCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK,
      samples: [s("2026-04-02", 90)],
      unit: "lb",
    });
    expect(m.chartPoints[4]!.weightKg).toBeNull();
    expect(m.isEmpty).toBe(true);
  });
});
