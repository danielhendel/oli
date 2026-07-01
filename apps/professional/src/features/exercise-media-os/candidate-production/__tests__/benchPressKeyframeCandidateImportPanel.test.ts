import { buildBenchPressImportedCandidateReviewState } from "../buildBenchPressImportedCandidateReviewState";
import { buildBenchPressKeyframeImportManifest } from "../buildBenchPressKeyframeImportManifest";

/** Panel data contract tests — no React Testing Library in professional workspace. */
describe("BenchPressKeyframeCandidateImportPanel data contract", () => {
  const manifest = buildBenchPressKeyframeImportManifest();
  const reviewState = buildBenchPressImportedCandidateReviewState();

  it("exposes expected keyframe rows when no files exist", () => {
    expect(manifest.items).toHaveLength(4);
    expect(manifest.items.map((item) => item.keyframePoseId)).toEqual([
      "setup",
      "start_lockout",
      "bottom_chest_pause",
      "finish_lockout",
    ]);
    expect(manifest.importableItemCount).toBe(0);
    expect(manifest.missingItemCount).toBe(4);
  });

  it("shows missing placeholders state when no files", () => {
    for (const item of manifest.items) {
      expect(item.fileExists).toBe(false);
    }
    expect(reviewState.importSummary.importedCandidateCount).toBe(0);
  });

  it("includes workflow warnings without approved-master readiness", () => {
    expect(
      reviewState.warnings.some((warning) => warning.includes("require human QA")),
    ).toBe(true);
    expect(
      reviewState.warnings.some((warning) => warning.includes("not approved-master")),
    ).toBe(true);
    expect(reviewState.candidateReviewState.imagePackReadiness).not.toBe("approved-master-ready");
  });

  it("manifest warnings describe draft/dev-test import only", () => {
    expect(manifest.warnings.some((warning) => warning.includes("draft/dev-test"))).toBe(true);
    for (const item of manifest.items) {
      expect(["draft", "dev-test"]).toContain(item.intendedCandidateStatus);
    }
  });
});
