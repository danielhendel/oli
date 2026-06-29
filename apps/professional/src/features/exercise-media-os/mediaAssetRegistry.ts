import { getBenchPressMediaAssetBySlotId, getBenchPressMediaAssets } from "./data/benchPressMediaAssets";
import { isBenchPressPilotExercise } from "./data/benchPressMasterMediaPackage";
import type { ExerciseMediaAsset } from "./types";

/** Whether an asset record has a resolvable media URL for playback. */
export function assetHasMediaPath(asset: ExerciseMediaAsset): boolean {
  return Boolean(asset.localPath?.trim() || asset.remoteUrl?.trim());
}

/** Whether an asset is approved and eligible for HTML video playback. */
export function isApprovedPlayableVideoAsset(asset: ExerciseMediaAsset): boolean {
  return asset.assetType === "video" && asset.status === "approved" && assetHasMediaPath(asset);
}

/** List all media assets for an exercise. Non-bench exercises return an empty list. */
export function listExerciseMediaAssets(exerciseId: string): ExerciseMediaAsset[] {
  if (!isBenchPressPilotExercise(exerciseId)) {
    return [];
  }
  return getBenchPressMediaAssets();
}

/** Get the media asset record for a slot, if defined in the manifest. */
export function getMediaAssetForSlot(
  exerciseId: string,
  slotId: string,
): ExerciseMediaAsset | undefined {
  if (!isBenchPressPilotExercise(exerciseId)) {
    return undefined;
  }
  return getBenchPressMediaAssetBySlotId(slotId);
}

/** Get an approved video asset for a slot, or undefined if not playable. */
export function getApprovedVideoAssetForSlot(
  exerciseId: string,
  slotId: string,
): ExerciseMediaAsset | undefined {
  const asset = getMediaAssetForSlot(exerciseId, slotId);
  if (!asset || !isApprovedPlayableVideoAsset(asset)) {
    return undefined;
  }
  return asset;
}

/** Whether a slot has an approved video asset with a media path. */
export function hasPlayableMediaAsset(exerciseId: string, slotId: string): boolean {
  return getApprovedVideoAssetForSlot(exerciseId, slotId) !== undefined;
}

/** Count approved playable video assets for an exercise. */
export function countApprovedPlayableVideoAssets(exerciseId: string): number {
  return listExerciseMediaAssets(exerciseId).filter(isApprovedPlayableVideoAsset).length;
}

export function mediaAssetStatusLabel(status: ExerciseMediaAsset["status"]): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "reviewed":
      return "Reviewed";
    case "draft":
      return "Draft";
    default:
      return "Pending";
  }
}

export function mediaAssetPlaybackLabel(exerciseId: string, slotId: string): string {
  if (hasPlayableMediaAsset(exerciseId, slotId)) {
    return "Master video available";
  }
  const asset = getMediaAssetForSlot(exerciseId, slotId);
  if (asset?.status === "approved") {
    return "Approved — file pending";
  }
  return "Asset pending production";
}
