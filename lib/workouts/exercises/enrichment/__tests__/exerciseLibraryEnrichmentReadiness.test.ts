import { buildExerciseLibraryEnrichmentReadiness } from "../buildExerciseLibraryEnrichmentReadiness";

describe("buildExerciseLibraryEnrichmentReadiness", () => {
  it("reports at least 25 enriched exercises", () => {
    const report = buildExerciseLibraryEnrichmentReadiness();
    expect(report.enrichedExerciseCount).toBeGreaterThanOrEqual(25);
    expect(report.top25EnrichedCount).toBe(25);
  });

  it("distinguishes metadata-ready from expert-reviewed", () => {
    const report = buildExerciseLibraryEnrichmentReadiness();
    expect(report.readyForExpertReviewCount).toBeGreaterThan(0);
    expect(report.expertReviewedCount).toBe(0);
    expect(report.readinessLabel).toBe("ready-for-expert-review");
  });

  it("does not falsely inflate expertReviewedCount", () => {
    const report = buildExerciseLibraryEnrichmentReadiness();
    expect(report.expertReviewedCount).toBe(0);
  });

  it("mediaReadyCount reflects planning readiness not approved media", () => {
    const report = buildExerciseLibraryEnrichmentReadiness();
    expect(report.mediaReadyCount).toBeGreaterThan(0);
    expect(report.warnings.some((w) => w.includes("does not imply approved media"))).toBe(true);
  });

  it("warnings mention expert review when not expert-reviewed", () => {
    const report = buildExerciseLibraryEnrichmentReadiness();
    expect(report.warnings.some((w) => w.toLowerCase().includes("expert"))).toBe(true);
  });

  it("score is deterministic", () => {
    const first = buildExerciseLibraryEnrichmentReadiness();
    const second = buildExerciseLibraryEnrichmentReadiness();
    expect(first).toEqual(second);
    expect(first.overallScore).toBeGreaterThan(0);
  });

  it("reports top50 planned count", () => {
    const report = buildExerciseLibraryEnrichmentReadiness();
    expect(report.top50PlannedCount).toBe(50);
  });
});
