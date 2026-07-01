import type { MediaAssetAspectRatio } from "../types";

export type CandidateImageQaWorksheetItemCategory =
  | "identity"
  | "pose"
  | "biomechanics"
  | "equipment"
  | "camera-framing"
  | "technical-quality"
  | "rights"
  | "brand";

export type CandidateImageQaWorksheetItemSeverity = "info" | "minor" | "major" | "critical";

export type CandidateImageQaWorksheetItem = {
  readonly itemId: string;
  readonly category: CandidateImageQaWorksheetItemCategory;
  readonly label: string;
  readonly description: string;
  readonly severity: CandidateImageQaWorksheetItemSeverity;
  readonly blocksMasterApproval: boolean;
  readonly defaultStatus: "not-reviewed";
};

export type CandidateImageQaWorksheet = {
  readonly worksheetId: string;
  readonly exerciseId: string;
  readonly candidateId: string;
  readonly keyframePoseId?: string;
  readonly renderTarget: MediaAssetAspectRatio;
  readonly items: readonly CandidateImageQaWorksheetItem[];
  readonly hardGateItemIds: readonly string[];
  readonly reviewStatus: "not-reviewed";
  readonly warnings: readonly string[];
};

function item(
  itemId: string,
  category: CandidateImageQaWorksheetItemCategory,
  label: string,
  description: string,
  severity: CandidateImageQaWorksheetItemSeverity,
  blocksMasterApproval: boolean,
): CandidateImageQaWorksheetItem {
  return {
    itemId,
    category,
    label,
    description,
    severity,
    blocksMasterApproval,
    defaultStatus: "not-reviewed",
  };
}

export type BuildCandidateImageQaWorksheetInput = {
  readonly exerciseId: string;
  readonly candidateId: string;
  readonly keyframePoseId?: string;
  readonly renderTarget: MediaAssetAspectRatio;
};

/** Build a generic image candidate human QA worksheet. */
export function buildCandidateImageQaWorksheet(
  input: BuildCandidateImageQaWorksheetInput,
): CandidateImageQaWorksheet {
  const items: CandidateImageQaWorksheetItem[] = [
    item(
      "identity-exercise",
      "identity",
      "Correct exercise",
      "Image depicts the intended canonical exercise.",
      "critical",
      true,
    ),
    item(
      "identity-character",
      "identity",
      "Correct character",
      "Oli Motion character identity matches spec.",
      "critical",
      true,
    ),
    item("rights-watermark", "rights", "No watermark", "No visible watermark.", "critical", true),
    item("rights-logos", "rights", "No logos", "No visible logos or brand marks.", "critical", true),
    item(
      "rights-readable-text",
      "rights",
      "No readable text",
      "No readable text overlays or signage.",
      "critical",
      true,
    ),
    item(
      "biomechanics-anatomy",
      "biomechanics",
      "Realistic human anatomy",
      "Anatomy is realistic with no impossible joints.",
      "major",
      true,
    ),
    item(
      "equipment-geometry",
      "equipment",
      "Realistic equipment geometry",
      "Equipment is not warped or distorted.",
      "major",
      true,
    ),
    item(
      "pose-single-keyframe",
      "pose",
      "Single keyframe pose",
      "Image shows one still keyframe pose only.",
      "major",
      true,
    ),
    item(
      "pose-no-multi-phase",
      "pose",
      "No multiple motion phases",
      "No multiple phases of the lift in one image.",
      "major",
      true,
    ),
    item(
      "camera-framing",
      "camera-framing",
      "Render target framing",
      "Framing matches required render target crop.",
      "minor",
      false,
    ),
    item(
      "technical-mobile",
      "technical-quality",
      "Mobile clarity",
      "Subject and equipment are clear on mobile crop.",
      "minor",
      false,
    ),
    item(
      "rights-review",
      "rights",
      "Rights review required",
      "Rights must be reviewed before master approval.",
      "critical",
      true,
    ),
    item(
      "brand-oli-studio",
      "brand",
      "Premium dark Oli studio",
      "Premium dark Oli studio aesthetic.",
      "minor",
      false,
    ),
  ];

  const hardGateItemIds = items
    .filter((worksheetItem) => worksheetItem.blocksMasterApproval)
    .map((worksheetItem) => worksheetItem.itemId);

  return {
    worksheetId: `candidate-image-qa-worksheet-v1-${input.candidateId}`,
    exerciseId: input.exerciseId,
    candidateId: input.candidateId,
    keyframePoseId: input.keyframePoseId,
    renderTarget: input.renderTarget,
    items,
    hardGateItemIds,
    reviewStatus: "not-reviewed",
    warnings: [
      "Worksheet is not-reviewed by default — human QA required.",
      "Completing this worksheet does not approve the candidate.",
    ],
  };
}
