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
    expect(result.importableCount).toBe(4);
    expect(result.skippedMissingCount).toBe(0);
  });

  it("all 4 fixture items produce deterministic candidate IDs", () => {
    const manifest = buildBenchPressKeyframeImportManifest({ filePresenceMap: ALL_PRESENT_MAP });
    const candidateIds = buildBenchPressImportedImageCandidates(manifest).candidates.map(
      (candidate) => candidate.candidateId,
    );
    expect(candidateIds).toEqual([
      "bench_press_setup_16x9_google_flow_v1_dev_test",
      "bench_press_start_lockout_16x9_google_flow_v1_dev_test",
      "bench_press_bottom_chest_pause_16x9_google_flow_v1_dev_test",
      "bench_press_finish_lockout_16x9_google_flow_v1_dev_test",
    ]);
  });

  it("fixture candidates use google-flow source and human QA reviewer notes", () => {
    const manifest = buildBenchPressKeyframeImportManifest({ filePresenceMap: ALL_PRESENT_MAP });
    const candidates = buildBenchPressImportedImageCandidates(manifest).candidates;
    for (const candidate of candidates) {
      expect(candidate.source.tool).toBe("google-flow");
      expect(candidate.localAsset.existsInRepo).toBe(true);
      expect(candidate.reviewerNotes.join(" ")).toMatch(/human Oli Media Factory QA/);
    }
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
