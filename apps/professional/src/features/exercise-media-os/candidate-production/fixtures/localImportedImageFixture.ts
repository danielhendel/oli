import { buildExpectedKeyframeImportPaths } from "../buildExpectedKeyframeImportPaths";
import type { CandidateImageImportManifestItem } from "../types";

/** Test fixture: local import metadata for bench_press setup 16:9 keyframe. */
export const LOCAL_IMPORTED_IMAGE_FIXTURE: CandidateImageImportManifestItem = {
  importItemId: "import-item-v1-fixture-bench-press-setup-16x9",
  productionPacketId:
    "prod-packet-v1-bench_press-setup-16:9-front_45_right",
  exerciseId: "bench_press",
  keyframePoseId: "setup",
  characterId: "oli_motion_male_m1",
  renderTarget: "16:9",
  ...(() => {
    const paths = buildExpectedKeyframeImportPaths("bench_press", "setup", "16:9");
    return {
      expectedRepoPath: paths.expectedRepoPath,
      expectedPublicPath: paths.expectedPublicPath,
    };
  })(),
  fileExists: true,
  intendedCandidateStatus: "dev-test",
  sourceTool: "local-fixture",
  promptVersion: "google-flow-prompt-packet-v1",
  importNotes: [
    "Fixture metadata only — represents a locally placed import file for tests.",
    "Not an approved-master import.",
  ],
};

export const LOCAL_IMPORTED_IMAGE_FIXTURE_DRAFT: CandidateImageImportManifestItem = {
  ...LOCAL_IMPORTED_IMAGE_FIXTURE,
  importItemId: "import-item-v1-fixture-bench-press-setup-16x9-draft",
  intendedCandidateStatus: "draft",
};
