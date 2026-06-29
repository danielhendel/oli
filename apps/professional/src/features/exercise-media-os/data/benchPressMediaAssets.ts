import {
  BENCH_PRESS_PILOT_ENABLED_SLOTS,
  BENCH_PRESS_PILOT_EXERCISE_ID,
} from "./benchPressMasterMediaPackage";
import {
  EXERCISE_MEDIA_ASSET_VERSION,
  type ExerciseMediaAsset,
} from "../types";

export const BENCH_PRESS_MEDIA_ASSET_MANIFEST_VERSION = "bench-press-media-assets-v1" as const;

const BENCH_PRESS_MEDIA_BASE_PATH = "/media/exercises/bench_press";

type BenchPressPilotSlotType =
  | "coachIntro"
  | "heroDemo"
  | "setup"
  | "execution"
  | "commonMistake"
  | "slowMotion"
  | "muscleOverlay"
  | "reflection";

const SLOT_VIDEO_FILES: Record<BenchPressPilotSlotType, string> = {
  coachIntro: "coach-intro.mp4",
  heroDemo: "hero-demo.mp4",
  setup: "setup.mp4",
  execution: "execution.mp4",
  commonMistake: "common-mistake.mp4",
  slowMotion: "slow-motion.mp4",
  muscleOverlay: "muscle-overlay.mp4",
  reflection: "reflection.mp4",
};

function slotIdForType(slotType: BenchPressPilotSlotType): string {
  return `bench-press-${slotType}`;
}

function buildBenchPressVideoAsset(
  slotType: BenchPressPilotSlotType,
  status: ExerciseMediaAsset["status"] = "missing",
): ExerciseMediaAsset {
  const filename = SLOT_VIDEO_FILES[slotType];
  const slotId = slotIdForType(slotType);
  const localPath = `${BENCH_PRESS_MEDIA_BASE_PATH}/${filename}`;

  return {
    assetId: `bench-press-asset-${slotType}`,
    exerciseId: BENCH_PRESS_PILOT_EXERCISE_ID,
    slotId,
    assetType: "video",
    status,
    source: status === "missing" ? "placeholder" : "oli-master",
    localPath,
    posterPath: `${BENCH_PRESS_MEDIA_BASE_PATH}/${slotType}-poster.jpg`,
    durationSeconds: undefined,
    aspectRatio: "16:9",
    captionsPath: `${BENCH_PRESS_MEDIA_BASE_PATH}/${filename.replace(".mp4", ".vtt")}`,
    version: EXERCISE_MEDIA_ASSET_VERSION,
    reviewedAt: status === "approved" ? "2026-06-01T00:00:00.000Z" : undefined,
    reviewedBy: status === "approved" ? "oli-media-review" : undefined,
  };
}

/** Local Bench Press media asset manifest — paths only; files optional. */
export const BENCH_PRESS_MEDIA_ASSETS: ExerciseMediaAsset[] = (
  BENCH_PRESS_PILOT_ENABLED_SLOTS as BenchPressPilotSlotType[]
).map((slotType) => buildBenchPressVideoAsset(slotType, "missing"));

export function getBenchPressMediaAssets(): ExerciseMediaAsset[] {
  return BENCH_PRESS_MEDIA_ASSETS;
}

export function getBenchPressMediaAssetBySlotId(slotId: string): ExerciseMediaAsset | undefined {
  return BENCH_PRESS_MEDIA_ASSETS.find((asset) => asset.slotId === slotId);
}
