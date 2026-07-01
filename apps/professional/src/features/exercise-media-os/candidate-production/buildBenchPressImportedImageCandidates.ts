import type { ExerciseMediaCandidate } from "../candidate-review/types";
import { validateMediaCandidate } from "../candidate-review/validateMediaCandidate";
import type { BenchPressKeyframeImportManifest } from "./buildBenchPressKeyframeImportManifest";
import { buildBenchPressKeyframeImportManifest } from "./buildBenchPressKeyframeImportManifest";
import { buildMediaCandidateFromImageImport } from "./buildMediaCandidateFromImageImport";
import type { CandidateImageImportManifestItem } from "./types";

export type BuildBenchPressImportedImageCandidatesResult = {
  readonly candidates: readonly ExerciseMediaCandidate[];
  readonly skippedMissingCount: number;
  readonly importableCount: number;
  readonly validationFailures: readonly string[];
};

function benchPressImportedCandidateId(keyframePoseId: string): string {
  return `bench_press_${keyframePoseId}_16x9_google_flow_v1_dev_test`;
}

function buildCandidateFromManifestItem(
  item: CandidateImageImportManifestItem,
): ExerciseMediaCandidate | null {
  const { candidate, issues } = buildMediaCandidateFromImageImport(
    item,
    `Imported Bench Press keyframe still image — ${item.keyframePoseId} — 16:9`,
    "watermark, logos, readable text, warped barbell, distorted hands, second rep, bounce, motion blur",
    {
      candidateId: benchPressImportedCandidateId(item.keyframePoseId),
      reviewerNotes: [
        "Imported keyframe candidate requires human Oli Media Factory QA before approval.",
        "This import does not imply approved-master status.",
      ],
    },
  );

  if (!candidate || issues.length > 0) {
    return null;
  }

  return candidate;
}

/** Convert importable Bench Press manifest items into M10 draft/dev-test image candidates. */
export function buildBenchPressImportedImageCandidates(
  manifest: BenchPressKeyframeImportManifest = buildBenchPressKeyframeImportManifest(),
): BuildBenchPressImportedImageCandidatesResult {
  const candidates: ExerciseMediaCandidate[] = [];
  const validationFailures: string[] = [];
  let skippedMissingCount = 0;

  for (const item of manifest.items) {
    if (!item.fileExists) {
      skippedMissingCount += 1;
      continue;
    }

    const candidate = buildCandidateFromManifestItem(item);
    if (!candidate) {
      validationFailures.push(`Failed to build candidate for ${item.keyframePoseId}`);
      continue;
    }

    const validation = validateMediaCandidate(candidate);
    if (!validation.valid) {
      validationFailures.push(
        `Validation failed for ${item.keyframePoseId}: ${validation.issues.map((issue) => issue.code).join(", ")}`,
      );
      continue;
    }

    candidates.push(candidate);
  }

  return {
    candidates,
    skippedMissingCount,
    importableCount: manifest.importableItemCount,
    validationFailures,
  };
}
