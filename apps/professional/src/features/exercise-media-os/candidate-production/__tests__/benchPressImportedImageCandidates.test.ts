import { buildCandidateQaScore } from "../../candidate-review/buildCandidateQaScore";
import { validateMediaCandidate } from "../../candidate-review/validateMediaCandidate";
import { buildBenchPressImportedImageCandidates } from "../buildBenchPressImportedImageCandidates";
import { buildBenchPressKeyframeImportManifest } from "../buildBenchPressKeyframeImportManifest";

const ALL_PRESENT_MAP = {
  "/media/exercises/bench_press/keyframes/setup-16x9.png": true,
  "/media/exercises/bench_press/keyframes/start-lockout-16x9.png": true,
  "/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png": true,
  "/media/exercises/bench_press/keyframes/finish-lockout-16x9.png": true,
} as const;

describe("buildBenchPressImportedImageCandidates", () => {
  const live = buildBenchPressImportedImageCandidates();

  it("missing manifest items produce no candidates in live repo", () => {
    expect(live.candidates).toHaveLength(0);
    expect(live.skippedMissingCount).toBe(4);
    expect(live.importableCount).toBe(0);
  });

  it("fileExists true items create dev-test candidates in fixture map", () => {
    const manifest = buildBenchPressKeyframeImportManifest({ filePresenceMap: ALL_PRESENT_MAP });
    const result = buildBenchPressImportedImageCandidates(manifest);
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates.every((candidate) => candidate.status === "dev-test")).toBe(true);
  });

  it("preserves bench_press identity fields", () => {
    const manifest = buildBenchPressKeyframeImportManifest({
      filePresenceMap: { "/media/exercises/bench_press/keyframes/setup-16x9.png": true },
    });
    const candidate = buildBenchPressImportedImageCandidates(manifest).candidates[0]!;
    expect(candidate.exerciseId).toBe("bench_press");
    expect(candidate.characterId).toBe("oli_motion_male_m1");
    expect(candidate.assetType).toBe("image");
    expect(candidate.keyframePoseId).toBe("setup");
    expect(candidate.renderTarget).toBe("16:9");
    expect(candidate.candidateId).toBe("bench_press_setup_16x9_google_flow_v1_dev_test");
  });

  it("rights default to internal-dev-only and QA is not approval eligible", () => {
    const manifest = buildBenchPressKeyframeImportManifest({
      filePresenceMap: { "/media/exercises/bench_press/keyframes/setup-16x9.png": true },
    });
    const candidate = buildBenchPressImportedImageCandidates(manifest).candidates[0]!;
    expect(candidate.rights.usageStatus).toBe("internal-dev-only");
    const qa = buildCandidateQaScore({
      qa: candidate.qa,
      rights: candidate.rights,
      status: candidate.status,
    });
    expect(qa.approvalEligible).toBe(false);
  });

  it("validateMediaCandidate passes for imported dev-test candidate", () => {
    const manifest = buildBenchPressKeyframeImportManifest({
      filePresenceMap: { "/media/exercises/bench_press/keyframes/setup-16x9.png": true },
    });
    const candidate = buildBenchPressImportedImageCandidates(manifest).candidates[0]!;
    expect(validateMediaCandidate(candidate).valid).toBe(true);
  });

  it("approved-master cannot be produced", () => {
    for (const candidate of buildBenchPressImportedImageCandidates(
      buildBenchPressKeyframeImportManifest({ filePresenceMap: ALL_PRESENT_MAP }),
    ).candidates) {
      expect(candidate.status).not.toBe("approved-master");
    }
  });
});
