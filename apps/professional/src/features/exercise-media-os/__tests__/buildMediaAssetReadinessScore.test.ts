import { buildMediaAssetReadinessScore, isPlayableProductionReady } from "../buildMediaAssetReadinessScore";
import { buildMediaReadinessScore } from "../buildMediaReadinessScore";
import { buildBenchPressPilotMasterMediaPackage } from "../data/benchPressMasterMediaPackage";
import { getExerciseMediaReadinessById } from "../exerciseMediaRegistry";

describe("buildMediaAssetReadinessScore", () => {
  it("reports not-ready when all bench_press manifest assets are missing", () => {
    const score = buildMediaAssetReadinessScore({ exerciseId: "bench_press" });
    expect(score.status).toBe("not-ready");
    expect(score.playableAssetCount).toBe(0);
    expect(isPlayableProductionReady(score)).toBe(false);
  });

  it("does not equate missing assets with approved-master or ready production", () => {
    const score = buildMediaAssetReadinessScore({ exerciseId: "bench_press" });
    expect(score.status).not.toBe("ready");
    expect(["ready", "approved-master"]).not.toContain(score.status);
  });

  it("reports no-manifest for exercises without a local asset manifest", () => {
    const score = buildMediaAssetReadinessScore({ exerciseId: "squat" });
    expect(score.status).toBe("no-manifest");
    expect(score.totalManifestAssets).toBe(0);
    expect(isPlayableProductionReady(score)).toBe(false);
  });

  it("flags when slot metadata readiness could overstate production readiness", () => {
    const slotMetadataReadiness = buildMediaReadinessScore(buildBenchPressPilotMasterMediaPackage());
    expect(slotMetadataReadiness.status).toBe("ready");

    const assetReadiness = buildMediaAssetReadinessScore({
      exerciseId: "bench_press",
      slotMetadataReadiness,
    });

    expect(assetReadiness.slotMetadataMayOverstateProduction).toBe(true);
    expect(assetReadiness.status).toBe("not-ready");
  });

  it("documents registry slot metadata vs playable asset distinction for bench_press", () => {
    const slotReadiness = getExerciseMediaReadinessById("bench_press");
    const assetReadiness = buildMediaAssetReadinessScore({
      exerciseId: "bench_press",
      slotMetadataReadiness: slotReadiness ?? undefined,
    });

    expect(slotReadiness?.status).toBe("ready");
    expect(assetReadiness.status).toBe("not-ready");
    expect(assetReadiness.recommendations.join(" ")).toMatch(/slot metadata/i);
  });
});
