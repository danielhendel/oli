import { describe, it, expect } from "@jest/globals";
import {
  bodyMarkerDays,
  bodyMetricsForSnapshotDay,
  compositionMetricsFromPeekRowsForSnapshotDay,
  dedupePeekRowsById,
  latestBodySnapshotDay,
  type BodySnapshotPeekRow,
} from "../bodySnapshot";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

const TZ = "UTC";

describe("bodySnapshot", () => {
  it("weight-first: latest weight day wins over a later body_composition-only day (e.g. RMR)", () => {
    const weightPoints = [
      { dayKey: "2026-03-27", observedAt: "2026-03-27T14:00:00.000Z", weightKg: 80 },
    ];
    const peekRows = [
      {
        kind: "body_composition",
        observedAt: "2026-04-02T20:00:00.000Z",
        payload: { restingMetabolicRateKcal: 1700 },
      },
    ];
    expect(latestBodySnapshotDay(weightPoints, peekRows, TZ)).toBe("2026-03-27");
  });

  it("Overview As of matches calendar day of latest weight (series + peek)", () => {
    const weightPoints = [
      { dayKey: "2026-04-01", observedAt: "2026-04-01T10:00:00.000Z", weightKg: 79 },
    ];
    const peekRows = [
      {
        kind: "weight",
        observedAt: "2026-04-03T15:00:00.000Z",
        payload: { weightKg: 78 },
      },
    ];
    expect(latestBodySnapshotDay(weightPoints, peekRows, TZ)).toBe("2026-04-03");
  });

  it("bodyMarkerDays with any weight: only weight days are marked, not composition-only days", () => {
    const weightPoints = [{ dayKey: "2026-03-27", observedAt: "2026-03-27T14:00:00.000Z", weightKg: 80 }];
    const peekRows = [
      {
        kind: "body_composition",
        observedAt: "2026-04-02T20:00:00.000Z",
        payload: { restingMetabolicRateKcal: 1700 },
      },
    ];
    const m = bodyMarkerDays(weightPoints, peekRows, TZ);
    expect(m.has("2026-03-27")).toBe(true);
    expect(m.has("2026-04-02")).toBe(false);
  });

  it("bodyMarkerDays: new weight day from peek appears alongside series days", () => {
    const weightPoints = [{ dayKey: "2026-03-27", observedAt: "2026-03-27T14:00:00.000Z", weightKg: 80 }];
    const peekRows = [
      {
        kind: "weight",
        observedAt: "2026-04-03T08:00:00.000Z",
        payload: { weightKg: 77 },
      },
    ];
    const m = bodyMarkerDays(weightPoints, peekRows, TZ);
    expect(m.has("2026-03-27")).toBe(true);
    expect(m.has("2026-04-03")).toBe(true);
  });

  it("fallback: no weight anywhere → latest composition day is snapshot and composition days are marked", () => {
    const peekRows = [
      {
        kind: "body_composition",
        observedAt: "2026-04-02T20:00:00.000Z",
        payload: { bmi: 22 },
      },
    ];
    expect(latestBodySnapshotDay([], peekRows, TZ)).toBe("2026-04-02");
    const m = bodyMarkerDays([], peekRows, TZ);
    expect(m.has("2026-04-02")).toBe(true);
  });

  it("merges three same-day body_composition rows (BMI, lean, RMR) with weight row body fat", () => {
    const day = "2026-04-03";
    const rows = [
      {
        id: "w1",
        kind: "weight" as const,
        observedAt: `${day}T08:00:00.000Z`,
        sourceId: "apple_health",
        payload: {
          time: `${day}T08:00:00.000Z`,
          timezone: TZ,
          weightKg: 80,
          bodyFatPercent: 19.5,
        },
      },
      {
        id: "c1",
        kind: "body_composition" as const,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        payload: { time: `${day}T10:00:00.000Z`, timezone: TZ, bmi: 23.2 },
      },
      {
        id: "c2",
        kind: "body_composition" as const,
        observedAt: `${day}T12:00:00.000Z`,
        sourceId: "apple_health",
        payload: { time: `${day}T12:00:00.000Z`, timezone: TZ, leanBodyMassKg: 61.5 },
      },
      {
        id: "c3",
        kind: "body_composition" as const,
        observedAt: `${day}T14:00:00.000Z`,
        sourceId: "apple_health",
        payload: { time: `${day}T14:00:00.000Z`, timezone: TZ, restingMetabolicRateKcal: 1680 },
      },
    ];
    const c = compositionMetricsFromPeekRowsForSnapshotDay(rows, day, TZ);
    expect(c.bodyFatPercent).toBe(19.5);
    expect(c.bmi).toBe(23.2);
    expect(c.leanBodyMassKg).toBe(61.5);
    expect(c.restingMetabolicRateKcal).toBe(1680);
  });

  it("merges same-day weight row body fat with body_composition BMI / lean / RMR (different timestamps)", () => {
    const day = "2026-04-10";
    const rows = [
      {
        id: "w1",
        kind: "weight",
        observedAt: `${day}T08:00:00.000Z`,
        sourceId: "apple_health",
        payload: {
          time: `${day}T08:00:00.000Z`,
          timezone: TZ,
          weightKg: 80,
          bodyFatPercent: 19.5,
        },
      },
      {
        id: "c1",
        kind: "body_composition",
        observedAt: `${day}T18:30:00.000Z`,
        sourceId: "apple_health",
        payload: {
          time: `${day}T18:30:00.000Z`,
          timezone: TZ,
          bmi: 24.1,
          leanBodyMassKg: 62,
          restingMetabolicRateKcal: 1650,
        },
      },
    ];
    const c = compositionMetricsFromPeekRowsForSnapshotDay(rows, day, TZ);
    expect(c.bodyFatPercent).toBe(19.5);
    expect(c.bmi).toBe(24.1);
    expect(c.leanBodyMassKg).toBe(62);
    expect(c.restingMetabolicRateKcal).toBe(1650);
  });

  it("bodyMetricsForSnapshotDay uses snapshot-day peek rows when global peek omits composition", () => {
    const day = "2026-04-11";
    const pt: WeightPoint = {
      dayKey: day,
      observedAt: `${day}T09:00:00.000Z`,
      weightKg: 81,
      sourceId: "apple_health",
    };
    const byDay = new Map<string, WeightPoint[]>([[day, [pt]]]);
    const globalPeek: BodySnapshotPeekRow[] = [];
    const snapshotPeek = [
      {
        id: "c1",
        kind: "body_composition",
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        payload: {
          time: `${day}T10:00:00.000Z`,
          timezone: TZ,
          bmi: 23,
        },
      },
    ];
    const m = bodyMetricsForSnapshotDay(day, byDay, globalPeek, snapshotPeek, TZ);
    expect(m.weightKgFromSeries).toBe(81);
    expect(m.peekComp.bmi).toBe(23);
  });

  it("dedupePeekRowsById prefers primary (snapshot) payload over global for same id", () => {
    const merged = dedupePeekRowsById(
      [{ id: "x", kind: "body_composition", observedAt: "2026-01-01T12:00:00.000Z", payload: { bmi: 22 } }],
      [{ id: "x", kind: "body_composition", observedAt: "2026-01-01T12:00:00.000Z", payload: { bmi: 99 } }],
    );
    expect(merged).toHaveLength(1);
    expect((merged[0]!.payload as { bmi: number }).bmi).toBe(22);
  });
});
