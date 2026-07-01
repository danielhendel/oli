import { buildApprovedMasterImagePack } from "../buildApprovedMasterImagePack";
import { validateApprovedMasterImagePack } from "../validateApprovedMasterImagePack";
import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";
import { APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES } from "../fixtures/approvedBenchPressImageCandidates";
import { APPROVED_MASTER_MINIMUM_SCORE } from "../types";

const FIXTURE_PACK_INPUT_BASE = {
  imagePackId: "test-bench-press-pack",
  packageVersion: "test-v1",
  createdAt: "2026-06-30T00:00:00.000Z",
  updatedAt: "2026-06-30T00:00:00.000Z",
  requireFilesInRepo: true,
} as const;

function buildApprovedFixturePack() {
  const keyframeSpec = buildBenchPressKeyframeSpec();
  return buildApprovedMasterImagePack({
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
    candidates: APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES,
    requiredRenderTargets: ["16:9"],
  });
}

describe("validateApprovedMasterImagePack", () => {
  it("passes validation for a complete approved-master fixture pack", () => {
    const pack = buildApprovedFixturePack();
    const result = validateApprovedMasterImagePack(pack);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((row) => row.severity === "error")).toHaveLength(0);
  });

  it("errors when approved-master has missing poses", () => {
    const pack = {
      ...buildApprovedFixturePack(),
      status: "approved-master" as const,
      missingPoseIds: ["bottom_chest_pause"] as const,
    };
    const result = validateApprovedMasterImagePack(pack);
    expect(result.valid).toBe(false);
    expect(result.issues.some((row) => row.code === "approved-master-missing-poses")).toBe(true);
  });

  it("errors when approved-master has hard gate failures", () => {
    const pack = {
      ...buildApprovedFixturePack(),
      qaSummary: {
        ...buildApprovedFixturePack().qaSummary,
        hardGateFailureCount: 1,
      },
    };
    const result = validateApprovedMasterImagePack(pack);
    expect(result.issues.some((row) => row.code === "approved-master-hard-gate-failures")).toBe(true);
  });

  it("errors when approved-master has rights not cleared", () => {
    const pack = {
      ...buildApprovedFixturePack(),
      qaSummary: {
        ...buildApprovedFixturePack().qaSummary,
        rightsCleared: false,
      },
    };
    const result = validateApprovedMasterImagePack(pack);
    expect(result.issues.some((row) => row.code === "approved-master-rights-not-cleared")).toBe(true);
  });

  it("errors on duplicate frame ids", () => {
    const pack = buildApprovedFixturePack();
    const duplicateFrame = pack.frames[0]!;
    const packWithDupes = {
      ...pack,
      frames: [duplicateFrame, { ...duplicateFrame }],
    };
    const result = validateApprovedMasterImagePack(packWithDupes);
    expect(result.issues.some((row) => row.code === "duplicate-frame-ids")).toBe(true);
  });

  it("errors on duplicate pose/renderTarget frame", () => {
    const pack = buildApprovedFixturePack();
    const frame = pack.frames[0]!;
    const packWithDupes = {
      ...pack,
      frames: [
        frame,
        {
          ...frame,
          frameId: "duplicate-pose-target",
          candidateId: "other-candidate",
        },
      ],
    };
    const result = validateApprovedMasterImagePack(packWithDupes);
    expect(result.issues.some((row) => row.code === "duplicate-pose-render-target")).toBe(true);
  });

  it("errors on empty publicPath", () => {
    const pack = buildApprovedFixturePack();
    const packWithEmptyPath = {
      ...pack,
      frames: pack.frames.map((frame, index) =>
        index === 0 ? { ...frame, publicPath: "" } : frame,
      ),
    };
    const result = validateApprovedMasterImagePack(packWithEmptyPath);
    expect(result.issues.some((row) => row.code === "empty-public-path")).toBe(true);
  });

  it("errors on empty altText", () => {
    const pack = buildApprovedFixturePack();
    const packWithEmptyAlt = {
      ...pack,
      frames: pack.frames.map((frame, index) =>
        index === 0 ? { ...frame, altText: "" } : frame,
      ),
    };
    const result = validateApprovedMasterImagePack(packWithEmptyAlt);
    expect(result.issues.some((row) => row.code === "empty-alt-text")).toBe(true);
  });

  it("errors when approved-master score is below threshold", () => {
    const pack = {
      ...buildApprovedFixturePack(),
      qaSummary: {
        ...buildApprovedFixturePack().qaSummary,
        minimumScore: APPROVED_MASTER_MINIMUM_SCORE - 1,
      },
    };
    const result = validateApprovedMasterImagePack(pack);
    expect(result.issues.some((row) => row.code === "approved-master-score-threshold")).toBe(true);
  });

  it("preserves bench_press exerciseId", () => {
    const pack = buildApprovedFixturePack();
    expect(pack.exerciseId).toBe("bench_press");
    const badPack = { ...pack, exerciseId: "bench_press_v2" };
    const result = validateApprovedMasterImagePack(badPack);
    expect(result.issues.some((row) => row.code === "bench-press-exercise-id")).toBe(true);
  });
});
