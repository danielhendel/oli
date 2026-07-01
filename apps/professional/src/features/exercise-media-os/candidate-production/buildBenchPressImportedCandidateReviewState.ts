import { buildCandidateQaScore } from "../candidate-review/buildCandidateQaScore";
import { buildCandidateReviewState } from "../candidate-review/buildCandidateReviewState";
import { buildBenchPressKeyframeCandidateQaWorksheet } from "../candidate-review/buildBenchPressKeyframeCandidateQaWorksheet";
import { buildCandidateImageQaReadiness } from "../candidate-review/buildCandidateImageQaReadiness";
import type { CandidateReviewState, ExerciseMediaCandidate } from "../candidate-review/types";
import { BENCH_PRESS_MEDIA_CANDIDATES } from "../candidate-review/data/benchPressMediaCandidates";
import { buildBenchPressKeyframeSpec } from "../keyframe-spec/buildBenchPressKeyframeSpec";
import type { BenchPressKeyframeImportManifest } from "./buildBenchPressKeyframeImportManifest";
import { buildBenchPressKeyframeImportManifest } from "./buildBenchPressKeyframeImportManifest";
import { buildBenchPressImportedImageCandidates } from "./buildBenchPressImportedImageCandidates";

export type BenchPressImportedCandidateReviewStateResult = {
  readonly candidateReviewState: CandidateReviewState;
  readonly importSummary: {
    readonly expectedItemCount: number;
    readonly importableItemCount: number;
    readonly missingItemCount: number;
    readonly importedCandidateCount: number;
    readonly importedPoseIds: readonly string[];
  };
  readonly qaWorksheetSummary: {
    readonly worksheetCount: number;
    readonly needsHumanReviewCount: number;
    readonly eligibleForMasterReviewCount: number;
  };
  readonly warnings: readonly string[];
};

export type BuildBenchPressImportedCandidateReviewStateInput = {
  readonly importManifest?: BenchPressKeyframeImportManifest;
  readonly importedCandidates?: readonly ExerciseMediaCandidate[];
  readonly includeExistingBenchPressCandidates?: boolean;
};

/** Compose Bench Press imported image candidates into M10 candidate review state. */
export function buildBenchPressImportedCandidateReviewState(
  input: BuildBenchPressImportedCandidateReviewStateInput = {},
): BenchPressImportedCandidateReviewStateResult {
  const manifest = input.importManifest ?? buildBenchPressKeyframeImportManifest();
  const imported =
    input.importedCandidates ??
    buildBenchPressImportedImageCandidates(manifest).candidates;

  const includeExisting = input.includeExistingBenchPressCandidates ?? true;
  const existingCandidates = includeExisting ? [...BENCH_PRESS_MEDIA_CANDIDATES] : [];

  const allCandidates: ExerciseMediaCandidate[] = [...existingCandidates, ...imported];
  const keyframeSpec = buildBenchPressKeyframeSpec();

  const candidateReviewState = buildCandidateReviewState({
    exerciseId: keyframeSpec.exerciseId,
    keyframeSpec: {
      exerciseId: keyframeSpec.exerciseId,
      characterId: keyframeSpec.characterId,
      requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
        poseId: pose.poseId,
        label: pose.label,
      })),
    },
    candidates: allCandidates,
    playableAssetCount: 0,
    slotMetadataApproved: false,
  });

  let needsHumanReviewCount = 0;
  let eligibleForMasterReviewCount = 0;

  for (const candidate of imported) {
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(candidate);
    const readiness = buildCandidateImageQaReadiness({ candidate, worksheet });
    if (readiness.readinessLabel === "needs-human-review" || readiness.readinessLabel === "dev-test") {
      needsHumanReviewCount += 1;
    }
    if (readiness.readinessLabel === "eligible-for-master-review") {
      eligibleForMasterReviewCount += 1;
    }
  }

  const qaScoreSamples = imported.map((candidate) =>
    buildCandidateQaScore({ qa: candidate.qa, rights: candidate.rights, status: candidate.status }),
  );

  const warnings: string[] = [
    "Imported candidates require human QA.",
    "Imported candidates are not approved-master.",
    "Image pack approval is not part of M15.",
  ];

  if (manifest.importableItemCount === 0) {
    warnings.push("No importable Bench Press keyframe PNG files in repo.");
  }

  if (qaScoreSamples.some((sample) => sample.approvalEligible)) {
    warnings.push("Unexpected: imported candidates should not be approval eligible in M15.");
  }

  if (candidateReviewState.imagePackReadiness === "approved-master-ready") {
    warnings.push("Unexpected: image pack must not be approved-master-ready from draft/dev-test imports.");
  }

  return {
    candidateReviewState,
    importSummary: {
      expectedItemCount: manifest.expectedItemCount,
      importableItemCount: manifest.importableItemCount,
      missingItemCount: manifest.missingItemCount,
      importedCandidateCount: imported.length,
      importedPoseIds: imported
        .map((candidate) => candidate.keyframePoseId)
        .filter((poseId): poseId is NonNullable<typeof poseId> => poseId !== undefined),
    },
    qaWorksheetSummary: {
      worksheetCount: imported.length,
      needsHumanReviewCount,
      eligibleForMasterReviewCount,
    },
    warnings,
  };
}
