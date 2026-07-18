/**
 * Source guards: Daily Timeline action truth — aggregate Steps, Recovery score,
 * workout reconciliation via shared core.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDailyTimelineAggregateAction } from "@/lib/features/timeline/isDailyTimelineAggregateAction";

describe("Daily Timeline action truth guards", () => {
  const root = join(__dirname, "..", "..", "..", "..");

  test("VM excludes aggregate Steps/activity_final and reconciles workouts via shared core", () => {
    const vm = readFileSync(join(root, "lib/features/timeline/buildTimelineDayVm.ts"), "utf8");
    const adapter = readFileSync(
      join(root, "lib/features/timeline/reconcileDailyTimelineWorkoutActions.ts"),
      "utf8",
    );
    expect(vm).toContain("isDailyTimelineAggregateAction");
    expect(vm).toContain("buildReconciledDailyTimelineWorkoutItems");
    expect(vm).toContain("exactDayReadinessScore");
    expect(vm).not.toMatch(/recoveryValue = `HRV/);
    expect(vm).not.toMatch(/hrvRmssd/);
    expect(adapter).toContain("reconcileWorkoutSessionsCore");
    expect(adapter).not.toMatch(/title-only|titleOnly|dedupeByTitle/);
  });

  test("predicate treats steps and activity_final as aggregates", () => {
    expect(isDailyTimelineAggregateAction({ kind: "steps" })).toBe(true);
    expect(isDailyTimelineAggregateAction({ kind: "activity_final" })).toBe(true);
    expect(isDailyTimelineAggregateAction({ sourceType: "steps" })).toBe(true);
    expect(isDailyTimelineAggregateAction({ sourceType: "activity" })).toBe(true);
    expect(isDailyTimelineAggregateAction({ kind: "workout" })).toBe(false);
    expect(isDailyTimelineAggregateAction({ sourceType: "insight" })).toBe(false);
  });

  test("useTimelineDay wires exact-day readiness without feed or provider pull", () => {
    const hook = readFileSync(join(root, "lib/features/timeline/useTimelineDay.ts"), "utf8");
    expect(hook).toContain("useReadinessView");
    expect(hook).toContain("readinessView");
    expect(hook).not.toContain("getTimelineFeed");
    expect(hook).not.toContain("pullNow");
    expect(hook).not.toContain("EXPO_PUBLIC_TIMELINE_FEED");
  });

  test("shipping screen does not special-case Steps or Recovery proxies", () => {
    const screen = readFileSync(join(root, "lib/ui/timeline/TimelineDayScreen.tsx"), "utf8");
    const card = readFileSync(join(root, "lib/ui/timeline/DailyTimelineContextCard.tsx"), "utf8");
    expect(screen).not.toContain("isMidnightFabricatedStepsItem");
    expect(screen).not.toContain("hrvRmssd");
    expect(card).not.toContain("hrvRmssd");
    expect(card).not.toContain("restingHeartRate");
  });
});
