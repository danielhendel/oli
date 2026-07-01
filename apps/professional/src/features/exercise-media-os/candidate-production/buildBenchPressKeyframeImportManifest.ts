import type { CandidateImageImportManifestItem } from "./types";
import {
  BENCH_PRESS_KEYFRAME_IMPORT_MANIFEST_VERSION,
  type BenchPressKeyframeImportManifestEntry,
  listBenchPressKeyframeImportManifestEntries,
} from "./data/benchPressKeyframeImportManifest.v1";
import type { BenchPressKeyframeImportPublicPath } from "./data/benchPressKeyframeImportManifest.v1";

export type BenchPressKeyframeImportManifest = {
  readonly manifestId: string;
  readonly manifestVersion: typeof BENCH_PRESS_KEYFRAME_IMPORT_MANIFEST_VERSION;
  readonly exerciseId: "bench_press";
  readonly characterId: "oli_motion_male_m1";
  readonly expectedItemCount: number;
  readonly importableItemCount: number;
  readonly missingItemCount: number;
  readonly items: readonly CandidateImageImportManifestItem[];
  readonly warnings: readonly string[];
  readonly nextRecommendedAction: string;
};

export type BuildBenchPressKeyframeImportManifestInput = {
  readonly filePresenceMap?: Readonly<Partial<Record<BenchPressKeyframeImportPublicPath, boolean>>>;
  readonly intendedCandidateStatus?: "draft" | "dev-test";
  readonly sourceTool?: CandidateImageImportManifestItem["sourceTool"];
  readonly promptVersion?: string;
};

function buildImportItemId(keyframePoseId: string, renderTarget: string): string {
  return `bench-press-import-v1-${keyframePoseId}-${renderTarget.replace(":", "x")}`;
}

function buildProductionPacketId(keyframePoseId: string): string {
  return `prod-packet-v1-bench_press-${keyframePoseId}-16:9-front_45_right`;
}

function toManifestItem(
  entry: BenchPressKeyframeImportManifestEntry,
  fileExists: boolean,
  intendedCandidateStatus: "draft" | "dev-test",
  sourceTool: CandidateImageImportManifestItem["sourceTool"],
  promptVersion: string,
): CandidateImageImportManifestItem {
  const importNotes: string[] = [
    "Bench Press keyframe import manifest — local repo truth only.",
    fileExists
      ? "File present in repo — may convert to draft/dev-test candidate."
      : "File missing — no candidate created.",
    "Never import as approved-master.",
  ];

  return {
    importItemId: buildImportItemId(entry.keyframePoseId, entry.renderTarget),
    productionPacketId: buildProductionPacketId(entry.keyframePoseId),
    exerciseId: entry.exerciseId,
    keyframePoseId: entry.keyframePoseId,
    characterId: entry.characterId,
    renderTarget: entry.renderTarget,
    expectedRepoPath: entry.expectedRepoPath,
    expectedPublicPath: entry.expectedPublicPath,
    fileExists,
    intendedCandidateStatus,
    sourceTool,
    promptVersion,
    importNotes,
  };
}

/** Build deterministic Bench Press keyframe import manifest from repo-truth file presence. */
export function buildBenchPressKeyframeImportManifest(
  input: BuildBenchPressKeyframeImportManifestInput = {},
): BenchPressKeyframeImportManifest {
  const intendedCandidateStatus = input.intendedCandidateStatus ?? "dev-test";
  const sourceTool = input.sourceTool ?? "google-flow";
  const promptVersion = input.promptVersion ?? "google-flow-prompt-packet-v1";

  const items = listBenchPressKeyframeImportManifestEntries().map((entry) => {
    const fileExists =
      input.filePresenceMap?.[entry.expectedPublicPath] ?? entry.fileExists;
    return toManifestItem(
      entry,
      fileExists,
      intendedCandidateStatus,
      sourceTool,
      promptVersion,
    );
  });

  const importableItemCount = items.filter((item) => item.fileExists).length;
  const expectedItemCount = items.length;
  const missingItemCount = expectedItemCount - importableItemCount;

  const warnings: string[] = [
    "Imported keyframe images are draft/dev-test candidates only.",
    "Human Oli Media Factory QA is required before master approval.",
    "Image pack approval is not part of M15.",
  ];

  if (importableItemCount === 0) {
    warnings.push("No Bench Press keyframe PNG files found in repo — importable count is 0.");
  }

  const nextRecommendedAction =
    importableItemCount === 0
      ? "Place externally generated 16:9 Bench Press keyframe PNGs under apps/professional/public/media/exercises/bench_press/keyframes/ and update file presence map."
      : "Review imported dev-test candidates with Bench Press keyframe QA worksheet before master promotion.";

  return {
    manifestId: "bench-press-keyframe-import-manifest-v1",
    manifestVersion: BENCH_PRESS_KEYFRAME_IMPORT_MANIFEST_VERSION,
    exerciseId: "bench_press",
    characterId: "oli_motion_male_m1",
    expectedItemCount,
    importableItemCount,
    missingItemCount,
    items,
    warnings,
    nextRecommendedAction,
  };
}
