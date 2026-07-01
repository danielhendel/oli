import { countApprovedPlayableVideoAssets, listExerciseMediaAssets } from "./mediaAssetRegistry";
import { isBenchPressPilotExercise } from "./data/benchPressMasterMediaPackage";
import { BENCH_PRESS_PILOT_ENABLED_SLOTS } from "./data/benchPressMasterMediaPackage";
import type { MediaReadinessScore } from "./types";

export const MEDIA_ASSET_READINESS_VERSION = "asset-readiness-v1" as const;

/**
 * Playable asset production readiness — distinct from slot metadata readiness
 * (`buildMediaReadinessScore`). Slot approval describes blueprint/package planning;
 * this score describes whether approved playable media files exist.
 */
export type MediaAssetReadinessStatus =
  | "not-ready"
  | "partial"
  | "ready"
  | "no-manifest";

export type MediaAssetReadinessScore = {
  readonly version: typeof MEDIA_ASSET_READINESS_VERSION;
  readonly exerciseId: string;
  /** Playable approved asset readiness — not slot metadata readiness. */
  readonly status: MediaAssetReadinessStatus;
  readonly playableAssetCount: number;
  readonly requiredSlotCount: number;
  readonly totalManifestAssets: number;
  readonly recommendations: readonly string[];
  /**
   * True when slot metadata readiness could be misread as production-ready
   * while playable assets are still missing.
   */
  readonly slotMetadataMayOverstateProduction: boolean;
};

export type BuildMediaAssetReadinessInput = {
  readonly exerciseId: string;
  readonly slotMetadataReadiness?: MediaReadinessScore;
};

function resolveRequiredSlotCount(exerciseId: string): number {
  if (isBenchPressPilotExercise(exerciseId)) {
    return BENCH_PRESS_PILOT_ENABLED_SLOTS.length;
  }
  return 0;
}

function computeStatus(
  playableAssetCount: number,
  requiredSlotCount: number,
  totalManifestAssets: number,
): MediaAssetReadinessStatus {
  if (totalManifestAssets === 0) {
    return "no-manifest";
  }
  if (playableAssetCount <= 0) {
    return "not-ready";
  }
  if (requiredSlotCount > 0 && playableAssetCount >= requiredSlotCount) {
    return "ready";
  }
  return "partial";
}

function buildRecommendations(
  status: MediaAssetReadinessStatus,
  playableAssetCount: number,
  requiredSlotCount: number,
): readonly string[] {
  if (status === "no-manifest") {
    return ["No local asset manifest exists for this exercise yet."];
  }
  if (status === "not-ready") {
    return [
      "No approved playable media assets exist — production is not ready despite slot metadata.",
      "Approve assets in the local manifest only after files pass QA.",
    ];
  }
  if (status === "partial") {
    return [
      `${playableAssetCount} of ${requiredSlotCount} required slots have approved playable assets.`,
      "Continue production until all required slots have approved master assets.",
    ];
  }
  return ["All required slots have approved playable media assets."];
}

/**
 * Score playable asset production readiness from the local asset manifest.
 * Does not inspect slot metadata status — use alongside `buildMediaReadinessScore`.
 */
export function buildMediaAssetReadinessScore(
  input: BuildMediaAssetReadinessInput,
): MediaAssetReadinessScore {
  const { exerciseId, slotMetadataReadiness } = input;
  const manifestAssets = listExerciseMediaAssets(exerciseId);
  const playableAssetCount = countApprovedPlayableVideoAssets(exerciseId);
  const requiredSlotCount = resolveRequiredSlotCount(exerciseId);
  const totalManifestAssets = manifestAssets.length;

  const status = computeStatus(playableAssetCount, requiredSlotCount, totalManifestAssets);

  const slotMetadataMayOverstateProduction =
    slotMetadataReadiness?.status === "ready" && status !== "ready";

  return {
    version: MEDIA_ASSET_READINESS_VERSION,
    exerciseId,
    status,
    playableAssetCount,
    requiredSlotCount,
    totalManifestAssets,
    recommendations: buildRecommendations(status, playableAssetCount, requiredSlotCount),
    slotMetadataMayOverstateProduction,
  };
}

/** Whether playable production readiness is satisfied — never true for missing manifests with zero playable assets. */
export function isPlayableProductionReady(score: MediaAssetReadinessScore): boolean {
  return score.status === "ready";
}
