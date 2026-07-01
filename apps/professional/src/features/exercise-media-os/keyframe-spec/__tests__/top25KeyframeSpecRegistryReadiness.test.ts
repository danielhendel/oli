import { buildTop25KeyframeSpecRegistryReadiness } from "../buildTop25KeyframeSpecRegistryReadiness";

describe("buildTop25KeyframeSpecRegistryReadiness", () => {
  const report = buildTop25KeyframeSpecRegistryReadiness();

  it("reports specReadyCount of 25", () => {
    expect(report.specReadyCount).toBe(25);
    expect(report.validSpecCount).toBe(25);
    expect(report.specCount).toBe(25);
    expect(report.totalTop25Exercises).toBe(25);
  });

  it("does not falsely inflate expertReviewedCount", () => {
    expect(report.expertReviewedCount).toBe(0);
    expect(report.needsExpertReviewCount).toBe(25);
  });

  it("reports mediaApprovedCount as 0", () => {
    expect(report.mediaApprovedCount).toBe(0);
  });

  it("readiness label is spec-ready or ready-for-expert-review", () => {
    expect(["spec-ready", "ready-for-expert-review"]).toContain(report.readinessLabel);
  });

  it("warnings state specs do not imply media approval", () => {
    expect(
      report.warnings.some(
        (warning) =>
          warning.includes("do not imply approved media") ||
          warning.includes("do not imply generated candidate"),
      ),
    ).toBe(true);
  });

  it("score is deterministic", () => {
    expect(buildTop25KeyframeSpecRegistryReadiness()).toEqual(report);
  });

  it("Bench Press alignment is true", () => {
    expect(report.benchPressAligned).toBe(true);
  });

  it("coverage metrics are complete", () => {
    expect(report.characterCoverage).toBe(25);
    expect(report.poseCoverage).toBe(25);
    expect(report.renderTargetCoverage).toBe(25);
    expect(report.viewCoverage).toBe(25);
    expect(report.qaCriteriaCoverage).toBe(25);
    expect(report.generationFailureCoverage).toBe(25);
  });
});
