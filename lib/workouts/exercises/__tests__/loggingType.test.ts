import { resolveStrengthLoggingType } from "@/lib/workouts/exercises/loggingType";

describe("resolveStrengthLoggingType", () => {
  it("resolves canonical push_up as bodyweight_reps", () => {
    expect(resolveStrengthLoggingType("push_up")).toBe("bodyweight_reps");
  });

  it("resolves canonical 90_90_hip_switch as reps_only", () => {
    expect(resolveStrengthLoggingType("90_90_hip_switch")).toBe("reps_only");
  });

  it("resolves canonical bench_press as weight_reps", () => {
    expect(resolveStrengthLoggingType("bench_press")).toBe("weight_reps");
  });

  it("uses custom logging type when provided", () => {
    expect(resolveStrengthLoggingType("push_up", "reps_only")).toBe("reps_only");
  });
});
