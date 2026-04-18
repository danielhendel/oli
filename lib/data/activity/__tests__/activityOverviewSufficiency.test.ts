import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
  meanNumericStepsForWindow,
  meanStepsPerDayZeroFilled,
  stepsWindowHasAnyErrorDay,
  stepsWindowHasFullNumericCoverage,
} from "@/lib/data/activity/activityOverviewSufficiency";

describe("stepsWindowHasFullNumericCoverage", () => {
  it("returns false when any day is absent from the map", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 1 },
    };
    expect(stepsWindowHasFullNumericCoverage(["2026-04-07", "2026-04-08"], rollup)).toBe(false);
  });

  it("returns false for explicit absent or error", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 0 },
      "2026-04-08": { kind: "absent" },
    };
    expect(stepsWindowHasFullNumericCoverage(["2026-04-07", "2026-04-08"], rollup)).toBe(false);
  });

  it("returns true when all days are numeric including explicit zero", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 0 },
      "2026-04-08": { kind: "numeric", steps: 100 },
    };
    expect(stepsWindowHasFullNumericCoverage(["2026-04-07", "2026-04-08"], rollup)).toBe(true);
  });

  it("returns false for empty day list", () => {
    expect(stepsWindowHasFullNumericCoverage([], {})).toBe(false);
  });
});

describe("meanNumericStepsForWindow", () => {
  it("averages after caller verified coverage", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 10 },
      "2026-04-08": { kind: "numeric", steps: 20 },
    };
    const days = ["2026-04-07", "2026-04-08"] as const;
    expect(stepsWindowHasFullNumericCoverage(days, rollup)).toBe(true);
    expect(meanNumericStepsForWindow(days, rollup)).toBe(15);
  });
});

describe("ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA", () => {
  it("matches product copy", () => {
    expect(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA).toBe("Not enough data");
  });
});

describe("stepsWindowHasAnyErrorDay", () => {
  it("is true when any listed day has kind error", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 1 },
      "2026-04-08": { kind: "error", message: "503", requestId: "r1" },
    };
    expect(stepsWindowHasAnyErrorDay(["2026-04-07", "2026-04-08"], rollup)).toBe(true);
  });

  it("is false when days are numeric, absent, or missing from map", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 1 },
    };
    expect(stepsWindowHasAnyErrorDay(["2026-04-07", "2026-04-08"], rollup)).toBe(false);
  });
});

describe("meanStepsPerDayZeroFilled", () => {
  it("uses full window length; non-numeric days count as 0", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: 10_000 },
      "2026-04-08": { kind: "error", message: "x", requestId: null },
    };
    const days = ["2026-04-07", "2026-04-08"] as const;
    expect(meanStepsPerDayZeroFilled(days, rollup)).toBe(5000);
  });

  it("returns 0 for empty day list", () => {
    expect(meanStepsPerDayZeroFilled([], {})).toBe(0);
  });
});
