import fs from "node:fs";
import path from "node:path";

import {
  BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1,
  listBenchPressKeyframeImportManifestEntries,
} from "../data/benchPressKeyframeImportManifest.v1";

export type BenchPressKeyframeFilePresenceOnDisk =
  typeof BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1;

const DEFAULT_REPO_ROOT = path.resolve(__dirname, "../../../../../../../..");

function isNonEmptyPngFile(absolutePath: string): boolean {
  try {
    const stat = fs.statSync(absolutePath);
    return stat.isFile() && stat.size > 0 && absolutePath.endsWith(".png");
  } catch {
    return false;
  }
}

/** Test-only: inspect Bench Press keyframe PNG presence on disk (repo truth). */
export function inspectBenchPressKeyframeFilePresenceOnDisk(
  repoRoot: string = DEFAULT_REPO_ROOT,
): BenchPressKeyframeFilePresenceOnDisk {
  const presence: Record<string, boolean> = {};

  for (const entry of listBenchPressKeyframeImportManifestEntries()) {
    const absolutePath = path.join(repoRoot, entry.expectedRepoPath);
    presence[entry.expectedPublicPath] = isNonEmptyPngFile(absolutePath);
  }

  return presence as BenchPressKeyframeFilePresenceOnDisk;
}

export function countTrueBenchPressKeyframeFilePresence(
  presence: Readonly<Record<string, boolean>>,
): number {
  return Object.values(presence).filter(Boolean).length;
}
