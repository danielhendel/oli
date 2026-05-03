import { buildActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";

describe("buildActivityThisWeekCardModel", () => {
  const week = [
    "2026-05-03",
    "2026-05-04",
    "2026-05-05",
    "2026-05-06",
    "2026-05-07",
    "2026-05-08",
    "2026-05-09",
  ] as const;

  it("only lists Sun→Sat days with numeric rollup (skips future days and gaps)", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-05-03": { kind: "numeric", steps: 100 },
      "2026-05-04": { kind: "absent" },
      "2026-05-05": { kind: "numeric", steps: 5000 },
    };
    const model = buildActivityThisWeekCardModel({
      todayDayKey: "2026-05-05",
      weekDayKeys: [...week],
      rollupByDay: rollup,
      baselineMeanSteps: 3000,
    });
    expect(model.days.map((d) => d.dayKey)).toEqual(["2026-05-03", "2026-05-05"]);
    expect(model.days[0]?.deltaText).toBe("-2,900");
    expect(model.days[1]?.deltaText).toBe("+2,000");
  });

  it("omits delta when baseline missing", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-05-03": { kind: "numeric", steps: 200 },
    };
    const model = buildActivityThisWeekCardModel({
      todayDayKey: "2026-05-05",
      weekDayKeys: [...week],
      rollupByDay: rollup,
      baselineMeanSteps: null,
    });
    expect(model.days[0]?.deltaText).toBeNull();
  });
});
