import {
  buildActivityRollupAggregateError,
  buildActivitySelectedDayRollupError,
  rollupEntryIsFailure,
} from "@/lib/data/activity/activityRollupErrorSummary";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";

describe("buildActivityRollupAggregateError", () => {
  it("returns null when no per-day errors", () => {
    const map: ActivityStepsRollupMap = {
      "2026-04-01": { kind: "numeric", steps: 100 },
      "2026-04-02": { kind: "absent" },
    };
    expect(buildActivityRollupAggregateError(map, jest.fn())).toBeNull();
  });

  it("surfaces a distinct message when at least one day failed (not treated as absent)", () => {
    const map: ActivityStepsRollupMap = {
      "2026-04-01": { kind: "numeric", steps: 100 },
      "2026-04-02": { kind: "error", message: "timeout", requestId: "rid-1" },
    };
    const onRetry = jest.fn();
    const err = buildActivityRollupAggregateError(map, onRetry);
    expect(err).not.toBeNull();
    expect(err!.message).toContain("one day");
    expect(err!.requestId).toBe("rid-1");
    err!.onRetry();
    expect(onRetry).toHaveBeenCalled();
  });

  it("pluralizes when multiple days failed", () => {
    const map: ActivityStepsRollupMap = {
      "2026-04-01": { kind: "error", message: "a", requestId: null },
      "2026-04-02": { kind: "error", message: "b", requestId: null },
    };
    const err = buildActivityRollupAggregateError(map, jest.fn());
    expect(err?.message).toContain("2 days");
  });
});

describe("buildActivitySelectedDayRollupError", () => {
  it("returns error payload for the selected day when that fetch failed", () => {
    const map: ActivityStepsRollupMap = {
      "2026-04-10": { kind: "error", message: "bad gateway", requestId: "r9" },
    };
    const err = buildActivitySelectedDayRollupError("2026-04-10", map, jest.fn());
    expect(err?.message).toBe("bad gateway");
    expect(err?.requestId).toBe("r9");
  });

  it("returns null when selected day is numeric", () => {
    const map: ActivityStepsRollupMap = {
      "2026-04-10": { kind: "numeric", steps: 50 },
    };
    expect(buildActivitySelectedDayRollupError("2026-04-10", map, jest.fn())).toBeNull();
  });
});

describe("rollupEntryIsFailure", () => {
  it("is true only for error kind", () => {
    expect(rollupEntryIsFailure({ kind: "error", message: "x", requestId: null })).toBe(true);
    expect(rollupEntryIsFailure({ kind: "absent" })).toBe(false);
    expect(rollupEntryIsFailure({ kind: "numeric", steps: 0 })).toBe(false);
    expect(rollupEntryIsFailure(undefined)).toBe(false);
  });
});
