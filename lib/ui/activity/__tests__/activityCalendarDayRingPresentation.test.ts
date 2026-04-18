import {
  buildActivityCalendarDayModelFromRollup,
  buildActivityCalendarDayModelFromStripMeta,
  resolveActivityCalendarDayRingPresentation,
} from "@/lib/ui/activity/activityCalendarDayRingPresentation";

describe("resolveActivityCalendarDayRingPresentation", () => {
  const today = "2026-04-15";

  it("uses rollup tier for past completed days only", () => {
    expect(
      resolveActivityCalendarDayRingPresentation({
        dayKey: "2026-04-10",
        todayKey: today,
        rollupReady: true,
        tierSource: "rollup",
        rollupEntry: { kind: "numeric", steps: 10_000 },
      }),
    ).toEqual({ kind: "tier", tierIndex: 3 });
  });

  it("uses current-day no-ring for today even with high rollup steps", () => {
    expect(
      resolveActivityCalendarDayRingPresentation({
        dayKey: today,
        todayKey: today,
        rollupReady: true,
        tierSource: "rollup",
        rollupEntry: { kind: "numeric", steps: 20_000 },
      }),
    ).toEqual({ kind: "currentDayNoRing" });
  });

  it("hides rings for future days", () => {
    expect(
      resolveActivityCalendarDayRingPresentation({
        dayKey: "2026-04-20",
        todayKey: today,
        rollupReady: true,
        tierSource: "rollup",
        rollupEntry: { kind: "numeric", steps: 12_000 },
      }),
    ).toEqual({ kind: "hidden" });
  });

  it("neutral fallback for past day without valid numeric steps", () => {
    expect(
      resolveActivityCalendarDayRingPresentation({
        dayKey: "2026-04-10",
        todayKey: today,
        rollupReady: true,
        tierSource: "rollup",
        rollupEntry: { kind: "numeric", steps: 0 },
      }),
    ).toEqual({ kind: "neutralFallback" });
  });

  it("strip tier ignores rollupReady (meta-driven only)", () => {
    expect(
      resolveActivityCalendarDayRingPresentation({
        dayKey: "2026-04-14",
        todayKey: today,
        rollupReady: false,
        tierSource: "strip",
        completedPastTierIndex: 2,
      }),
    ).toEqual({ kind: "tier", tierIndex: 2 });
  });
});

describe("buildActivityCalendarDayModelFromRollup", () => {
  const today = "2026-04-15";

  it("labels today without tier name", () => {
    const m = buildActivityCalendarDayModelFromRollup({
      dayKey: today,
      todayKey: today,
      rollupReady: true,
      rollupEntry: { kind: "numeric", steps: 9000 },
    });
    expect(m.presentation).toEqual({ kind: "currentDayNoRing" });
    expect(m.accessibilityDetail).toBe("today, steps in daily rollup");
  });

  it("labels today with no positive rollup steps as current day", () => {
    const m = buildActivityCalendarDayModelFromRollup({
      dayKey: today,
      todayKey: today,
      rollupReady: true,
      rollupEntry: { kind: "numeric", steps: 0 },
    });
    expect(m.presentation).toEqual({ kind: "currentDayNoRing" });
    expect(m.accessibilityDetail).toBe("today, current day");
  });

  it("labels past tier days with rating name", () => {
    const m = buildActivityCalendarDayModelFromRollup({
      dayKey: "2026-04-14",
      todayKey: today,
      rollupReady: true,
      rollupEntry: { kind: "numeric", steps: 9000 },
    });
    expect(m.presentation).toEqual({ kind: "tier", tierIndex: 2 });
    expect(m.accessibilityDetail).toBe("Average, steps in daily rollup");
  });
});

describe("buildActivityCalendarDayModelFromStripMeta", () => {
  const today = "2026-04-15";

  it("ignores strip tier index on today", () => {
    const m = buildActivityCalendarDayModelFromStripMeta({
      dayKey: today,
      todayKey: today,
      meta: { hasSteps: true, ringTierIndex: 0 },
    });
    expect(m.presentation).toEqual({ kind: "currentDayNoRing" });
    expect(m.accessibilityDetail).toBe("today, steps in daily rollup");
  });

  it("strip today without steps uses current-day copy", () => {
    const m = buildActivityCalendarDayModelFromStripMeta({
      dayKey: today,
      todayKey: today,
      meta: { hasSteps: false, ringTierIndex: null },
    });
    expect(m.presentation).toEqual({ kind: "currentDayNoRing" });
    expect(m.accessibilityDetail).toBe("today, current day");
  });

  it("uses strip tier index for completed past days", () => {
    const m = buildActivityCalendarDayModelFromStripMeta({
      dayKey: "2026-04-14",
      todayKey: today,
      meta: { hasSteps: true, ringTierIndex: 4 },
    });
    expect(m.presentation).toEqual({ kind: "tier", tierIndex: 4 });
  });
});
