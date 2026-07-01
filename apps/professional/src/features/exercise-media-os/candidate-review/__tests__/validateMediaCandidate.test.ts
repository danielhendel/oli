import { validateMediaCandidate } from "../validateMediaCandidate";
import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../data/benchPressMediaCandidates";
import type { ExerciseMediaCandidate } from "../types";
import { CANDIDATE_QA_DIMENSION_IDS } from "../types";

function baseCandidate(overrides: Partial<ExerciseMediaCandidate> = {}): ExerciseMediaCandidate {
  return {
    ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE,
    ...overrides,
  };
}

describe("validateMediaCandidate", () => {
  it("returns error for empty candidateId", () => {
    const result = validateMediaCandidate(baseCandidate({ candidateId: "" }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "empty-candidate-id")).toBe(true);
  });

  it("returns error for unknown characterId", () => {
    const result = validateMediaCandidate(
      baseCandidate({ characterId: "unknown_character" as ExerciseMediaCandidate["characterId"] }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unknown-character-id")).toBe(true);
  });

  it("returns error for approved-master with internal-dev-only rights", () => {
    const result = validateMediaCandidate(
      baseCandidate({
        status: "approved-master",
        rights: {
          ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.rights,
          usageStatus: "internal-dev-only",
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "approved-master-not-eligible")).toBe(true);
  });

  it("returns error for approved-master with watermark rights flag", () => {
    const result = validateMediaCandidate(
      baseCandidate({
        status: "approved-master",
        rights: {
          ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.rights,
          containsWatermark: true,
          usageStatus: "cleared-for-oli-master",
          allowsCommercialUse: true,
          allowsClientPlayback: true,
        },
        qa: {
          ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.qa,
          masterApprovalChecklist: {
            ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.qa.masterApprovalChecklist,
            noWatermark: false,
            rightsClear: true,
          },
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "approved-master-watermark" || issue.code === "approved-master-not-eligible",
      ),
    ).toBe(true);
  });

  it("returns error for bench_press with invalid keyframe pose", () => {
    const result = validateMediaCandidate(
      baseCandidate({
        assetType: "image",
        keyframePoseId: "invalid_pose" as ExerciseMediaCandidate["keyframePoseId"],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "invalid-bench-press-pose")).toBe(true);
  });

  it("returns error for rejected without reasons", () => {
    const result = validateMediaCandidate(
      baseCandidate({
        status: "rejected",
        rejectionReasons: [],
        qa: {
          ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.qa,
          findings: [],
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "rejected-without-reason")).toBe(true);
  });

  it("returns error for superseded without lineage", () => {
    const result = validateMediaCandidate(
      baseCandidate({
        status: "superseded",
        lineage: { notes: [] },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "superseded-without-lineage")).toBe(true);
  });

  it("validates dev-test hero candidate without errors", () => {
    const result = validateMediaCandidate(BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("requires image candidates to include keyframePoseId", () => {
    const result = validateMediaCandidate(
      baseCandidate({
        assetType: "image",
        keyframePoseId: undefined,
        qa: {
          ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.qa,
          dimensionScores: CANDIDATE_QA_DIMENSION_IDS.map((dimensionId) => ({
            dimensionId,
            score: 3 as const,
            weight: 1,
            notes: [],
          })),
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "image-missing-keyframe-pose")).toBe(true);
  });
});
