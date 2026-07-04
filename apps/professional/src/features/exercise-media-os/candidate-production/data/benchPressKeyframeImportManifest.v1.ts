import type { BenchPressKeyframePoseId } from "../../keyframe-spec/types";
import { BENCH_PRESS_REQUIRED_POSE_IDS } from "../../keyframe-spec/types";
import { buildExpectedKeyframeImportPaths } from "../buildExpectedKeyframeImportPaths";

export const BENCH_PRESS_KEYFRAME_IMPORT_MANIFEST_VERSION =
  "bench-press-keyframe-import-manifest-v1" as const;

export const BENCH_PRESS_KEYFRAME_IMPORT_PROMPT_VERSION = "google-flow-prompt-packet-v1" as const;

const BENCH_PRESS_EXERCISE_ID = "bench_press" as const;
const BENCH_PRESS_CHARACTER_ID = "oli_motion_male_m1" as const;
const BENCH_PRESS_RENDER_TARGET = "16:9" as const;

/**
 * Repo-truth file presence for Bench Press 16:9 keyframe PNGs.
 *
 * Inspected via:
 * find apps/professional/public/media/exercises/bench_press/keyframes -maxdepth 1 -type f
 *
 * Result (Media-I3, 2026-06-30): only README.md exists — all 4 required PNGs missing.
 * Google Flow character: Oli Male Trainer (characterId oli_motion_male_m1).
 *
 * Update these values only when real PNG files are added at the expected repo paths.
 * Tests assert this map matches on-disk truth via inspectBenchPressKeyframeFilePresenceOnDisk.
 */
export const BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1 = {
  "/media/exercises/bench_press/keyframes/setup-16x9.png": false,
  "/media/exercises/bench_press/keyframes/start-lockout-16x9.png": false,
  "/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png": false,
  "/media/exercises/bench_press/keyframes/finish-lockout-16x9.png": false,
} as const;

export type BenchPressKeyframeImportPublicPath =
  keyof typeof BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1;

export const BENCH_PRESS_KEYFRAME_IMPORT_POSE_ORDER: readonly BenchPressKeyframePoseId[] =
  BENCH_PRESS_REQUIRED_POSE_IDS;

export type BenchPressKeyframeImportManifestEntry = {
  readonly exerciseId: typeof BENCH_PRESS_EXERCISE_ID;
  readonly keyframePoseId: BenchPressKeyframePoseId;
  readonly characterId: typeof BENCH_PRESS_CHARACTER_ID;
  readonly renderTarget: typeof BENCH_PRESS_RENDER_TARGET;
  readonly expectedPublicPath: BenchPressKeyframeImportPublicPath;
  readonly expectedRepoPath: string;
  readonly fileExists: boolean;
  readonly intendedCandidateStatus: "dev-test";
  readonly sourceTool: "google-flow";
  readonly promptVersion: typeof BENCH_PRESS_KEYFRAME_IMPORT_PROMPT_VERSION;
};

/** Static expected Bench Press keyframe import entries in M9 pose order. */
export function listBenchPressKeyframeImportManifestEntries(): readonly BenchPressKeyframeImportManifestEntry[] {
  return BENCH_PRESS_KEYFRAME_IMPORT_POSE_ORDER.map((keyframePoseId) => {
    const paths = buildExpectedKeyframeImportPaths(
      BENCH_PRESS_EXERCISE_ID,
      keyframePoseId,
      BENCH_PRESS_RENDER_TARGET,
    );
    const expectedPublicPath = paths.expectedPublicPath as BenchPressKeyframeImportPublicPath;

    return {
      exerciseId: BENCH_PRESS_EXERCISE_ID,
      keyframePoseId,
      characterId: BENCH_PRESS_CHARACTER_ID,
      renderTarget: BENCH_PRESS_RENDER_TARGET,
      expectedPublicPath,
      expectedRepoPath: paths.expectedRepoPath,
      fileExists: BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1[expectedPublicPath],
      intendedCandidateStatus: "dev-test",
      sourceTool: "google-flow",
      promptVersion: BENCH_PRESS_KEYFRAME_IMPORT_PROMPT_VERSION,
    };
  });
}
