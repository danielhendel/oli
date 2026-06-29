import {
  BENCH_PRESS_MEDIA_ASSETS,
  BENCH_PRESS_MEDIA_ASSET_MANIFEST_VERSION,
  getBenchPressMediaAssetBySlotId,
} from "../data/benchPressMediaAssets";
import { BENCH_PRESS_PILOT_ENABLED_SLOTS } from "../data/benchPressMasterMediaPackage";
import {
  assetHasMediaPath,
  countApprovedPlayableVideoAssets,
  getApprovedVideoAssetForSlot,
  getMediaAssetForSlot,
  hasPlayableMediaAsset,
  isApprovedPlayableVideoAsset,
  listExerciseMediaAssets,
  mediaAssetPlaybackLabel,
} from "../mediaAssetRegistry";
import type { ExerciseMediaAsset } from "../types";
import { buildBenchPressLessonPlaybackPlan } from "../playback/buildLessonPlaybackPlan";
import { buildBenchPressExerciseProductPipeline } from "../bench-press-product/buildBenchPressExerciseProductPipeline";
import { buildBenchPressPilotMasterMediaPackage } from "../data/benchPressMasterMediaPackage";
import { mergeMediaComposerState } from "../buildMediaComposerState";
import { isPlayablePlaybackMediaAsset } from "../playback/types";

describe("benchPressMediaAssets manifest", () => {
  it("exists for all bench_press pilot slots", () => {
    expect(BENCH_PRESS_MEDIA_ASSETS).toHaveLength(BENCH_PRESS_PILOT_ENABLED_SLOTS.length);
    expect(BENCH_PRESS_MEDIA_ASSET_MANIFEST_VERSION).toBe("bench-press-media-assets-v1");
    for (const slotType of BENCH_PRESS_PILOT_ENABLED_SLOTS) {
      const asset = getBenchPressMediaAssetBySlotId(`bench-press-${slotType}`);
      expect(asset?.exerciseId).toBe("bench_press");
      expect(asset?.assetType).toBe("video");
      expect(asset?.localPath).toContain("/media/exercises/bench_press/");
    }
  });
});

describe("mediaAssetRegistry", () => {
  it("returns assets for bench_press slots", () => {
    const asset = getMediaAssetForSlot("bench_press", "bench-press-heroDemo");
    expect(asset?.slotId).toBe("bench-press-heroDemo");
    expect(asset?.status).toBe("missing");
  });

  it("returns no assets for non-bench exercises", () => {
    expect(listExerciseMediaAssets("squat")).toEqual([]);
    expect(getMediaAssetForSlot("squat", "bench-press-heroDemo")).toBeUndefined();
    expect(hasPlayableMediaAsset("squat", "bench-press-heroDemo")).toBe(false);
  });

  it("does not treat missing-status assets as playable", () => {
    expect(hasPlayableMediaAsset("bench_press", "bench-press-heroDemo")).toBe(false);
    expect(getApprovedVideoAssetForSlot("bench_press", "bench-press-heroDemo")).toBeUndefined();
  });

  it("treats approved assets with paths as playable", () => {
    const approved: ExerciseMediaAsset = {
      assetId: "test",
      exerciseId: "bench_press",
      slotId: "bench-press-setup",
      assetType: "video",
      status: "approved",
      source: "oli-master",
      localPath: "/media/exercises/bench_press/setup.mp4",
      aspectRatio: "16:9",
      version: "media-asset-v1",
    };
    expect(isApprovedPlayableVideoAsset(approved)).toBe(true);
    expect(assetHasMediaPath(approved)).toBe(true);
  });

  it("does not treat draft assets as playable", () => {
    const draft: ExerciseMediaAsset = {
      assetId: "test",
      exerciseId: "bench_press",
      slotId: "bench-press-setup",
      assetType: "video",
      status: "draft",
      source: "oli-master",
      localPath: "/media/exercises/bench_press/setup.mp4",
      aspectRatio: "16:9",
      version: "media-asset-v1",
    };
    expect(isApprovedPlayableVideoAsset(draft)).toBe(false);
  });

  it("labels pending assets honestly", () => {
    expect(mediaAssetPlaybackLabel("bench_press", "bench-press-heroDemo")).toBe(
      "Asset pending production",
    );
  });

  it("countApprovedPlayableVideoAssets is zero by default", () => {
    expect(countApprovedPlayableVideoAssets("bench_press")).toBe(0);
  });
});

describe("playback plan asset attachment", () => {
  it("still has 8 scenes with default manifest", () => {
    const plan = buildBenchPressLessonPlaybackPlan({
      pipeline: buildBenchPressExerciseProductPipeline(),
      mediaPackage: buildBenchPressPilotMasterMediaPackage(),
      composer: mergeMediaComposerState("bench_press"),
      clientGoal: "Primary Activation",
    });
    expect(plan.scenes).toHaveLength(8);
    expect(plan.approvedVideoAssetCount).toBe(0);
    expect(plan.assetStatus).toBe("placeholder-only");
    expect(plan.scenes.every((scene) => !isPlayablePlaybackMediaAsset(scene.mediaAsset))).toBe(true);
  });

  it("supports attaching approved assets when provided", () => {
    const plan = buildBenchPressLessonPlaybackPlan({
      pipeline: buildBenchPressExerciseProductPipeline(),
      mediaPackage: buildBenchPressPilotMasterMediaPackage(),
      composer: mergeMediaComposerState("bench_press"),
      clientGoal: "Primary Activation",
      assetStatus: "partial-assets",
    });
    const withAsset = {
      ...plan.scenes[1]!,
      mediaAsset: {
        assetId: "test-hero",
        assetType: "video" as const,
        localPath: "/media/exercises/bench_press/hero-demo.mp4",
        status: "approved" as const,
        source: "oli-master" as const,
        aspectRatio: "16:9" as const,
      },
    };
    expect(isPlayablePlaybackMediaAsset(withAsset.mediaAsset)).toBe(true);
  });
});
