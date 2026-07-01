import { BENCH_PRESS_KEYFRAME_IMPORT_POSE_ORDER } from "../data/benchPressKeyframeImportManifest.v1";
import { buildBenchPressKeyframeImportManifest } from "../buildBenchPressKeyframeImportManifest";

describe("buildBenchPressKeyframeImportManifest", () => {
  const manifest = buildBenchPressKeyframeImportManifest();

  it("has exactly 4 expected keyframes", () => {
    expect(manifest.expectedItemCount).toBe(4);
    expect(manifest.items).toHaveLength(4);
    expect(manifest.exerciseId).toBe("bench_press");
    expect(manifest.characterId).toBe("oli_motion_male_m1");
  });

  it("paths match expected public path pattern", () => {
    for (const item of manifest.items) {
      expect(item.expectedPublicPath).toMatch(
        /^\/media\/exercises\/bench_press\/keyframes\/[a-z0-9-]+-16x9\.png$/,
      );
      expect(item.expectedRepoPath).toContain(
        "apps/professional/public/media/exercises/bench_press/keyframes/",
      );
    }
  });

  it("live repo has no importable files", () => {
    expect(manifest.importableItemCount).toBe(0);
    expect(manifest.missingItemCount).toBe(4);
    for (const item of manifest.items) {
      expect(item.fileExists).toBe(false);
    }
  });

  it("fileExists true makes item importable in fixture map", () => {
    const fixture = buildBenchPressKeyframeImportManifest({
      filePresenceMap: {
        "/media/exercises/bench_press/keyframes/setup-16x9.png": true,
      },
    });
    expect(fixture.importableItemCount).toBe(1);
    expect(fixture.items.find((item) => item.keyframePoseId === "setup")?.fileExists).toBe(true);
  });

  it("intended status can only be draft or dev-test", () => {
    for (const item of manifest.items) {
      expect(["draft", "dev-test"]).toContain(item.intendedCandidateStatus);
    }
    expect(
      buildBenchPressKeyframeImportManifest({ intendedCandidateStatus: "draft" }).items[0]
        ?.intendedCandidateStatus,
    ).toBe("draft");
  });

  it("sort order is setup, start_lockout, bottom_chest_pause, finish_lockout", () => {
    const poseIds = manifest.items.map((item) => item.keyframePoseId);
    expect(poseIds).toEqual([...BENCH_PRESS_KEYFRAME_IMPORT_POSE_ORDER]);
  });

  it("does not imply approved-master import", () => {
    for (const item of manifest.items) {
      expect(item.intendedCandidateStatus).not.toBe("approved-master" as never);
    }
    expect(manifest.warnings.some((warning) => warning.includes("draft/dev-test"))).toBe(true);
  });
});
