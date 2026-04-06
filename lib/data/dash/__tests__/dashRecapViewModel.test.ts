import {
  buildDashRecapPlaceholderRows,
  buildDashRecapRows,
  dashRecapRowsAllPlaceholders,
  DASH_RECAP_VALUE_PLACEHOLDER,
  mergeCardioSessionsIntoDashRecapRows,
} from "../dashRecapViewModel";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";

function baseFacts(overrides: Partial<DailyFactsDto> = {}): DailyFactsDto {
  return {
    schemaVersion: 1,
    userId: "u1",
    date: "2026-04-05",
    computedAt: "2026-04-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildDashRecapPlaceholderRows", () => {
  it("returns five labeled placeholder rows", () => {
    const rows = buildDashRecapPlaceholderRows();
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.id)).toEqual([
      "weight",
      "sleep",
      "steps",
      "strengthWorkouts",
      "calories",
    ]);
    expect(rows.every((r) => r.valueText === DASH_RECAP_VALUE_PLACEHOLDER && r.isPlaceholder)).toBe(true);
    expect(rows.every((r) => r.bar.kind === "none")).toBe(true);
  });
});

describe("buildDashRecapRows", () => {
  it("formats populated DailyFacts fields", () => {
    const rows = buildDashRecapRows({
      facts: baseFacts({
        body: { weightKg: 80 },
        sleep: { totalMinutes: 450 },
        activity: { steps: 8421 },
        strength: { workoutsCount: 2, totalSets: 8, totalReps: 40, totalVolumeByUnit: { kg: 1000 } },
        nutrition: { totalKcal: 2100.4, proteinG: 100, carbsG: 200, fatG: 60 },
      }),
      massUnit: "kg",
    });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.weight?.isPlaceholder).toBe(false);
    expect(byId.weight?.valueText).toContain("kg");
    expect(byId.sleep?.valueText).toMatch(/7h/);
    expect(byId.steps?.valueText).toBe("8421");
    expect(byId.strengthWorkouts?.valueText).toBe("2");
    expect(byId.calories?.valueText).toBe("2100");
    expect(byId.weight?.bar.kind).toBe("none");
    expect(byId.sleep?.bar.kind).toBe("placement");
    expect(byId.steps?.bar.kind).toBe("placement");
    expect(byId.strengthWorkouts?.bar.kind).toBe("placement");
    expect(byId.calories?.bar.kind).toBe("placement");
  });

  it("uses placeholders for absent optional slices", () => {
    const rows = buildDashRecapRows({ facts: baseFacts(), massUnit: "lb" });
    expect(dashRecapRowsAllPlaceholders(rows)).toBe(true);
  });

  it("shows zero strength workouts when strength object is present", () => {
    const rows = buildDashRecapRows({
      facts: baseFacts({
        strength: { workoutsCount: 0, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
      }),
      massUnit: "lb",
    });
    const s = rows.find((r) => r.id === "strengthWorkouts");
    expect(s?.valueText).toBe("0");
    expect(s?.isPlaceholder).toBe(false);
    expect(s?.bar).toMatchObject({ kind: "placement", markerPosition01: 0 });
  });
});

describe("dashRecapRowsAllPlaceholders", () => {
  it("is false when any row has a value", () => {
    const rows = buildDashRecapRows({
      facts: baseFacts({ activity: { steps: 1 } }),
      massUnit: "kg",
    });
    expect(dashRecapRowsAllPlaceholders(rows)).toBe(false);
  });

  it("ignores cardio row when checking DailyFacts placeholders", () => {
    const factRows = buildDashRecapRows({
      facts: baseFacts(),
      massUnit: "kg",
    });
    const merged = mergeCardioSessionsIntoDashRecapRows(factRows, { kind: "ready", count: 2 });
    expect(dashRecapRowsAllPlaceholders(merged)).toBe(true);
  });
});

describe("mergeCardioSessionsIntoDashRecapRows", () => {
  it("inserts cardio before calories", () => {
    const factRows = buildDashRecapRows({
      facts: baseFacts({ nutrition: { totalKcal: 100, proteinG: 1, carbsG: 1, fatG: 1 } }),
      massUnit: "kg",
    });
    const merged = mergeCardioSessionsIntoDashRecapRows(factRows, { kind: "ready", count: 3 });
    const ids = merged.map((r) => r.id);
    expect(ids.indexOf("cardioSessions")).toBe(ids.indexOf("calories") - 1);
    expect(merged.find((r) => r.id === "cardioSessions")?.valueText).toBe("3");
    expect(merged.find((r) => r.id === "cardioSessions")?.bar.kind).toBe("placement");
  });

  it("uses placeholder when unavailable", () => {
    const merged = mergeCardioSessionsIntoDashRecapRows(buildDashRecapPlaceholderRows(), {
      kind: "unavailable",
    });
    const c = merged.find((r) => r.id === "cardioSessions");
    expect(c?.valueText).toBe(DASH_RECAP_VALUE_PLACEHOLDER);
    expect(c?.isPlaceholder).toBe(true);
    expect(c?.bar.kind).toBe("none");
  });
});
