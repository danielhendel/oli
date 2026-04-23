import { getBundledExerciseNameById, resolveBundledExerciseIdForAnalyticsIntelligence } from "../taxonomyResolve";

describe("taxonomyResolve", () => {
  it("resolves bundled display names for catalog ids", () => {
    expect(getBundledExerciseNameById("bench_press")).toBe("Bench Press");
    expect(getBundledExerciseNameById("  squat  ")).toBe("Back Squat");
  });

  it("leaves active bundled ids unchanged for analytics intelligence merge", () => {
    expect(resolveBundledExerciseIdForAnalyticsIntelligence("bench_press")).toBe("bench_press");
  });

  it("returns unknown custom ids unchanged", () => {
    expect(resolveBundledExerciseIdForAnalyticsIntelligence("custom_userab12_my_move")).toBe(
      "custom_userab12_my_move",
    );
  });
});
