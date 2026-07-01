import { CANDIDATE_QA_DIMENSION_IDS, type CandidateValidationIssue } from "../candidate-review/types";
import { validateMediaCandidate } from "../candidate-review/validateMediaCandidate";
import type {
  CandidateQaDimensionScore,
  CandidateReviewStatus,
  ExerciseMediaCandidate,
} from "../candidate-review/types";
import type { BuildMediaCandidateFromImageImportResult, CandidateImageImportManifestItem } from "./types";

const IMPORT_TIMESTAMP = "2026-06-30T00:00:00.000Z" as const;

function buildCandidateId(item: CandidateImageImportManifestItem): string {
  const targetSlug = item.renderTarget.replace(":", "x");
  return `candidate-import-v1-${item.exerciseId}-${item.keyframePoseId}-${targetSlug}`;
}

function defaultDimensionScores(): CandidateQaDimensionScore[] {
  return CANDIDATE_QA_DIMENSION_IDS.map((dimensionId) => ({
    dimensionId,
    score: 0 as const,
    weight: 1,
    notes: ["Imported candidate — requires M10 QA review before approval."],
  }));
}

function resolveCandidateStatus(
  item: CandidateImageImportManifestItem,
): CandidateReviewStatus | null {
  if (item.intendedCandidateStatus === "draft") {
    return "draft";
  }
  if (item.intendedCandidateStatus === "dev-test") {
    return "dev-test";
  }
  return null;
}

export type BuildMediaCandidateFromImageImportOptions = {
  readonly candidateId?: string;
  readonly reviewerNotes?: readonly string[];
};

/** Convert an import manifest item into an M10 ExerciseMediaCandidate (draft/dev-test only). */
export function buildMediaCandidateFromImageImport(
  item: CandidateImageImportManifestItem,
  promptText = "",
  negativePromptText = "",
  options: BuildMediaCandidateFromImageImportOptions = {},
): BuildMediaCandidateFromImageImportResult {
  const issues: CandidateValidationIssue[] = [];

  if (!item.fileExists) {
    issues.push({
      code: "file-missing",
      severity: "error",
      message: "Cannot import candidate — file does not exist in repo metadata",
      fieldPath: "fileExists",
    });
    return { candidate: null, issues };
  }

  const status = resolveCandidateStatus(item);
  if (!status) {
    issues.push({
      code: "invalid-import-status",
      severity: "error",
      message: "Import status must be draft or dev-test — approved-master is not allowed",
      fieldPath: "intendedCandidateStatus",
    });
    return { candidate: null, issues };
  }

  const reviewerNotes = options.reviewerNotes ?? [
    "Imported keyframe candidate requires human Oli Media Factory QA before approval.",
    "This import does not imply approved-master status.",
  ];

  const candidate: ExerciseMediaCandidate = {
    candidateId: options.candidateId ?? buildCandidateId(item),
    exerciseId: item.exerciseId,
    assetType: "image",
    status,
    characterId: item.characterId,
    keyframePoseId: item.keyframePoseId as ExerciseMediaCandidate["keyframePoseId"],
    renderTarget: item.renderTarget,
    source: {
      tool: item.sourceTool,
      generatedAt: IMPORT_TIMESTAMP,
    },
    prompt: {
      promptVersion: item.promptVersion,
      promptText: promptText || `Imported keyframe image for ${item.exerciseId} ${item.keyframePoseId}`,
      negativePromptText:
        negativePromptText || "watermark, logos, readable text, warped equipment, distorted hands",
    },
    localAsset: {
      expectedPublicPath: item.expectedPublicPath,
      existsInRepo: item.fileExists,
    },
    qa: {
      dimensionScores: defaultDimensionScores(),
      findings: [
        {
          findingId: "import-needs-qa",
          severity: "info",
          category: "rightsCleanliness",
          message: "Imported candidate requires M10 QA before any master approval.",
          blocksMasterApproval: true,
        },
      ],
      masterApprovalChecklist: {
        noWatermark: false,
        noLogosOrReadableText: false,
        correctCharacter: false,
        correctExercise: false,
        realisticAnatomy: false,
        realisticEquipment: false,
        educationallyClear: false,
        rightsClear: false,
      },
    },
    rights: {
      usageStatus: "internal-dev-only",
      sourceOwnership: "oli-created",
      allowsCommercialUse: false,
      allowsClientPlayback: false,
      requiresAttribution: false,
      containsWatermark: false,
      containsLogosOrReadableText: false,
      notes: ["Imported candidate — rights not cleared for Oli master until M10 review."],
    },
    lineage: {
      notes: [`Imported from production packet: ${item.productionPacketId}`],
    },
    reviewerNotes: [...reviewerNotes],
    rejectionReasons: [],
    createdAt: IMPORT_TIMESTAMP,
    updatedAt: IMPORT_TIMESTAMP,
  };

  const validation = validateMediaCandidate(candidate);
  if (!validation.valid) {
    return { candidate: null, issues: validation.issues };
  }

  return { candidate, issues };
}
