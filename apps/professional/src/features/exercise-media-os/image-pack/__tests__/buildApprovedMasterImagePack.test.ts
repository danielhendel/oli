import { buildApprovedMasterImagePack } from "../buildApprovedMasterImagePack";
import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";
import { APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES } from "../fixtures/approvedBenchPressImageCandidates";
import {
  DEV_TEST_SETUP_IMAGE_FIXTURE,
  HARD_GATE_FAILURE_FIXTURE_CANDIDATE,
  INCOMPLETE_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES,
  RIGHTS_BLOCKED_FIXTURE_CANDIDATE,
  VIDEO_CANDIDATE_FOR_IMAGE_PACK_TEST,
} from "../fixtures/incompleteBenchPressImageCandidates";

const FIXTURE_PACK_INPUT_BASE = {
  imagePackId: "test-bench-press-pack",
  packageVersion: "test-v1",
  createdAt: "2026-06-30T00:00:00.000Z",
  updatedAt: "2026-06-30T00:00:00.000Z",
  requireFilesInRepo: true,
} as const;

function buildFixtureInput(candidates: typeof APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES) {
  const keyframeSpec = buildBenchPressKeyframeSpec();
  return {
    ...FIXTURE_PACK_INPUT_BASE,
    exerciseId: keyframeSpec.exerciseId,
    keyframeSpec: {
      exerciseId: keyframeSpec.exerciseId,
      keyframeSetId: keyframeSpec.keyframeSetId,
      keyframeVersion: keyframeSpec.keyframeVersion,
      characterId: keyframeSpec.characterId,
      requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
        poseId: pose.poseId,
        label: pose.label,
        purpose: pose.purpose,
      })),
    },
    candidates,
    requiredRenderTargets: ["16:9"] as const,
  };
}

describe("buildApprovedMasterImagePack", () => {
  it("builds approved-master pack from four approved Bench Press fixture candidates", () => {
    const input = buildFixtureInput(APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES);
    const pack = buildApprovedMasterImagePack(input);

    expect(pack.status).toBe("approved-master");
    expect(pack.exerciseId).toBe("bench_press");
    expect(pack.characterId).toBe("oli_motion_male_m1");
    expect(pack.frames).toHaveLength(4);
    expect(pack.approvedPoseIds).toEqual([
      "setup",
      "start_lockout",
      "bottom_chest_pause",
      "finish_lockout",
    ]);
    expect(pack.coverageLevel).toBe("master-16x9");
    expect(pack.thumbnailFrameId).toBeTruthy();
    expect(pack.frames.some((frame) => frame.frameId === pack.thumbnailFrameId)).toBe(true);
  });

  it("includes setup/start_lockout/bottom_chest_pause/finish_lockout frames", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput(APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES),
    );
    const poseIds = pack.frames.map((frame) => frame.keyframePoseId);
    expect(poseIds).toEqual([
      "setup",
      "start_lockout",
      "bottom_chest_pause",
      "finish_lockout",
    ]);
  });

  it("computes minimum and average QA score", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput(APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES),
    );
    expect(pack.qaSummary.minimumScore).toBeGreaterThanOrEqual(90);
    expect(pack.qaSummary.averageScore).toBeGreaterThanOrEqual(90);
    expect(pack.qaSummary.hardGateFailureCount).toBe(0);
    expect(pack.qaSummary.rightsCleared).toBe(true);
  });

  it("rejects missing required pose", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput(INCOMPLETE_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES),
    );
    expect(pack.status).not.toBe("approved-master");
    expect(pack.missingPoseIds).toContain("bottom_chest_pause");
  });

  it("rejects dev-test candidate for approved frame", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput([
        DEV_TEST_SETUP_IMAGE_FIXTURE,
        ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES.slice(1),
      ]),
    );
    expect(pack.missingPoseIds).toContain("setup");
    expect(pack.status).not.toBe("approved-master");
  });

  it("rejects video candidate for image frame requirement", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput([
        ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES,
        VIDEO_CANDIDATE_FOR_IMAGE_PACK_TEST,
      ]),
    );
    expect(pack.frames.every((frame) => frame.candidateId !== VIDEO_CANDIDATE_FOR_IMAGE_PACK_TEST.candidateId)).toBe(true);
    expect(pack.warnings.some((w) => w.includes("Video candidates"))).toBe(true);
  });

  it("rejects candidate with rights not cleared", () => {
    const candidates = APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES.map((candidate) =>
      candidate.keyframePoseId === "bottom_chest_pause"
        ? RIGHTS_BLOCKED_FIXTURE_CANDIDATE
        : candidate,
    );
    const pack = buildApprovedMasterImagePack(buildFixtureInput(candidates));
    expect(pack.status).not.toBe("approved-master");
    expect(pack.missingPoseIds).toContain("bottom_chest_pause");
  });

  it("rejects candidate with hard-gate failure", () => {
    const candidates = APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES.map((candidate) =>
      candidate.keyframePoseId === "bottom_chest_pause"
        ? HARD_GATE_FAILURE_FIXTURE_CANDIDATE
        : candidate,
    );
    const pack = buildApprovedMasterImagePack(buildFixtureInput(candidates));
    expect(pack.status).not.toBe("approved-master");
  });

  it("does not mutate input candidates", () => {
    const candidates = [...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES];
    const frozen = JSON.stringify(candidates);
    buildApprovedMasterImagePack(buildFixtureInput(candidates));
    expect(JSON.stringify(candidates)).toBe(frozen);
  });

  it("selects deterministically when multiple candidates exist for same pose", () => {
    const lowerScore = {
      ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!,
      candidateId: "fixture_setup_lower_score",
      updatedAt: "2026-01-01T00:00:00.000Z",
      qa: {
        ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!.qa,
        dimensionScores: APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!.qa.dimensionScores.map(
          (row) => ({ ...row, score: 3 as const }),
        ),
      },
    };

    const pack = buildApprovedMasterImagePack(
      buildFixtureInput([lowerScore, APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!]),
    );

    const setupFrame = pack.frames.find((frame) => frame.keyframePoseId === "setup");
    expect(setupFrame?.candidateId).toBe(APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!.candidateId);
  });

  it("sets deterministic thumbnailFrameId to lowest sortOrder frame for approved-master packs", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput(APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES),
    );
    const lowestSortOrderFrame = [...pack.frames].sort((left, right) => left.sortOrder - right.sortOrder)[0];
    expect(pack.thumbnailFrameId).toBe(lowestSortOrderFrame?.frameId);
  });

  it("does not set thumbnailFrameId for incomplete packs", () => {
    const pack = buildApprovedMasterImagePack(
      buildFixtureInput(INCOMPLETE_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES),
    );
    expect(pack.status).not.toBe("approved-master");
    expect(pack.thumbnailFrameId).toBeUndefined();
  });
});
