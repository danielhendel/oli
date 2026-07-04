import {
  buildExercisePrescriptionRowSummary,
  formatDesignedSetDetailLine,
} from "../buildExercisePrescriptionRowSummary";
import type { WorkoutDesignedSet } from "../types";

function makeSet(overrides: Partial<WorkoutDesignedSet> & Pick<WorkoutDesignedSet, "setNumber">): WorkoutDesignedSet {
  const { setNumber, ...rest } = overrides;
  return {
    setId: `set-${setNumber}`,
    setNumber,
    reps: null,
    repRange: "8-12",
    loadGuidance: "",
    rpeTarget: 8,
    rirTarget: 2,
    restSeconds: 90,
    tempo: "",
    notes: "",
    ...rest,
  };
}

describe("buildExercisePrescriptionRowSummary", () => {
  it("summarizes three identical sets to shared values", () => {
    const sets = [
      makeSet({ setNumber: 1 }),
      makeSet({ setNumber: 2 }),
      makeSet({ setNumber: 3 }),
    ];
    const input = [...sets];
    const summary = buildExercisePrescriptionRowSummary(input);

    expect(summary.setCount).toBe(3);
    expect(summary.repRangeValue).toBe("8-12");
    expect(summary.repRangeIsMixed).toBe(false);
    expect(summary.rpeValue).toBe("8");
    expect(summary.rpeIsMixed).toBe(false);
    expect(summary.restSecondsValue).toBe("90");
    expect(summary.restSecondsIsMixed).toBe(false);
    expect(summary.missingDesignedSets).toBe(false);
    expect(input).toEqual(sets);
  });

  it("detects mixed reps", () => {
    const summary = buildExercisePrescriptionRowSummary([
      makeSet({ setNumber: 1, repRange: "6-8" }),
      makeSet({ setNumber: 2, repRange: "10-12" }),
    ]);
    expect(summary.repRangeIsMixed).toBe(true);
    expect(summary.repRangeValue).toBe("Mixed");
  });

  it("detects mixed RPE", () => {
    const summary = buildExercisePrescriptionRowSummary([
      makeSet({ setNumber: 1, rpeTarget: 7 }),
      makeSet({ setNumber: 2, rpeTarget: 9 }),
    ]);
    expect(summary.rpeIsMixed).toBe(true);
    expect(summary.rpeValue).toBe("Mixed");
  });

  it("detects mixed rest", () => {
    const summary = buildExercisePrescriptionRowSummary([
      makeSet({ setNumber: 1, restSeconds: 60 }),
      makeSet({ setNumber: 2, restSeconds: 120 }),
    ]);
    expect(summary.restSecondsIsMixed).toBe(true);
    expect(summary.restSecondsValue).toBe("Mixed");
  });

  it("detects mixed tempo", () => {
    const summary = buildExercisePrescriptionRowSummary([
      makeSet({ setNumber: 1, tempo: "3-1-1" }),
      makeSet({ setNumber: 2, tempo: "2-0-2" }),
    ]);
    expect(summary.tempoIsMixed).toBe(true);
    expect(summary.tempoValue).toBe("Mixed");
  });

  it("returns warning for empty designedSets", () => {
    const summary = buildExercisePrescriptionRowSummary([]);
    expect(summary.setCount).toBe(0);
    expect(summary.missingDesignedSets).toBe(true);
    expect(summary.warnings.length).toBeGreaterThan(0);
  });
});

describe("formatDesignedSetDetailLine", () => {
  it("formats a designed set detail line", () => {
    const line = formatDesignedSetDetailLine({
      setId: "set-1",
      setNumber: 1,
      reps: null,
      repRange: "8-12",
      loadGuidance: "",
      rpeTarget: 8,
      rirTarget: 2,
      restSeconds: 90,
      tempo: "3-1-1",
      notes: "",
    });
    expect(line).toContain("Set 1");
    expect(line).toContain("8-12");
    expect(line).toContain("RPE 8");
    expect(line).toContain("90s");
    expect(line).toContain("3-1-1");
  });

  it("formats RIR when RPE is unset", () => {
    const line = formatDesignedSetDetailLine({
      setId: "set-1",
      setNumber: 1,
      reps: null,
      repRange: "5",
      loadGuidance: "",
      rpeTarget: null,
      rirTarget: 2,
      restSeconds: 60,
      tempo: "",
      notes: "",
    });
    expect(line).toContain("RIR 2");
    expect(line).not.toContain("RPE");
  });
});
