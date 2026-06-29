import { buildMediaExperiencePayloadRef } from "../../buildMediaExperiencePayloadRef";
import { buildDefaultMediaComposerState } from "../../buildMediaComposerState";
import {
  BENCH_PRESS_PILOT_ENABLED_SLOTS,
  buildBenchPressPilotMasterMediaPackage,
} from "../../data/benchPressMasterMediaPackage";
import {
  BENCH_PRESS_ASSET_STATUS,
  BENCH_PRESS_BRIEF_VERSION,
  BENCH_PRESS_PRODUCT_EXERCISE_ID,
  BENCH_PRESS_PRODUCT_VERSION,
  BENCH_PRESS_QA_VERSION,
  isBenchPressProductExercise,
} from "../benchPressProductConstants";
import { buildBenchPressExerciseProductPipeline } from "../buildBenchPressExerciseProductPipeline";
import { buildBenchPressExpertMediaQAChecklist } from "../buildBenchPressExpertMediaQAChecklist";
import { buildBenchPressMediaStoryboard } from "../buildBenchPressMediaStoryboard";
import { buildBenchPressProductionBrief } from "../buildBenchPressProductionBrief";

const CRITICAL_BIOMECHANICS_SLOT_TYPES = [
  "heroDemo",
  "setup",
  "execution",
  "commonMistake",
  "slowMotion",
] as const;

describe("buildBenchPressExerciseProductPipeline", () => {
  it("builds pipeline for bench_press", () => {
    const pipeline = buildBenchPressExerciseProductPipeline();
    expect(pipeline.exerciseId).toBe(BENCH_PRESS_PRODUCT_EXERCISE_ID);
    expect(pipeline.productVersion).toBe(BENCH_PRESS_PRODUCT_VERSION);
    expect(pipeline.assetStatus).toBe(BENCH_PRESS_ASSET_STATUS);
  });

  it("storyboard has 8 scenes in expected order", () => {
    const pipeline = buildBenchPressExerciseProductPipeline();
    expect(pipeline.storyboard.scenes).toHaveLength(8);
    expect(pipeline.storyboard.scenes.map((scene) => scene.slotType)).toEqual(
      BENCH_PRESS_PILOT_ENABLED_SLOTS,
    );
  });

  it("storyboard scene slot IDs match media package slot IDs", () => {
    const mediaPackage = buildBenchPressPilotMasterMediaPackage();
    const storyboard = buildBenchPressMediaStoryboard({ mediaPackage });
    const packageSlotIds = BENCH_PRESS_PILOT_ENABLED_SLOTS.map(
      (slotType) => mediaPackage.slots.find((slot) => slot.slotType === slotType)?.slotId,
    );
    expect(storyboard.scenes.map((scene) => scene.slotId)).toEqual(packageSlotIds);
  });

  it("storyboard references Academy and Intelligence fields", () => {
    const storyboard = buildBenchPressMediaStoryboard();
    for (const scene of storyboard.scenes) {
      const academyRefs = scene.academyReferences.filter((ref) => ref.source === "academy");
      const intelligenceRefs = scene.intelligenceReferences.filter(
        (ref) => ref.source === "intelligence",
      );
      expect(academyRefs.length).toBeGreaterThan(0);
      expect(intelligenceRefs.length).toBeGreaterThan(0);
    }
  });

  it("production brief exists for every storyboard scene", () => {
    const storyboard = buildBenchPressMediaStoryboard();
    const brief = buildBenchPressProductionBrief(storyboard);
    expect(brief.scenes).toHaveLength(storyboard.scenes.length);
    for (const scene of storyboard.scenes) {
      const sceneBrief = brief.scenes.find((row) => row.sceneId === scene.sceneId);
      expect(sceneBrief).toBeDefined();
      expect(sceneBrief?.slotType).toBe(scene.slotType);
    }
  });

  it("every production scene has required brief fields", () => {
    const brief = buildBenchPressProductionBrief(buildBenchPressMediaStoryboard());
    for (const scene of brief.scenes) {
      expect(scene.narrationScript.trim().length).toBeGreaterThan(0);
      expect(scene.onScreenText.trim().length).toBeGreaterThan(0);
      expect(scene.shotList.length).toBeGreaterThan(0);
      expect(scene.overlayPlan.length).toBeGreaterThan(0);
      expect(scene.aiGenerationPrompt.trim().length).toBeGreaterThan(0);
      expect(scene.aiNegativePrompt.trim().length).toBeGreaterThan(0);
    }
  });

  it("critical biomechanics constraints exist for key movement scenes", () => {
    const brief = buildBenchPressProductionBrief(buildBenchPressMediaStoryboard());
    for (const slotType of CRITICAL_BIOMECHANICS_SLOT_TYPES) {
      const scene = brief.scenes.find((row) => row.slotType === slotType);
      expect(scene).toBeDefined();
      const critical = scene?.biomechanicsConstraints.filter(
        (constraint) => constraint.severity === "critical",
      );
      expect(critical?.length).toBeGreaterThan(0);
    }
  });

  it("QA checklist exists for every scene", () => {
    const storyboard = buildBenchPressMediaStoryboard();
    const brief = buildBenchPressProductionBrief(storyboard);
    const qa = buildBenchPressExpertMediaQAChecklist(storyboard, brief);
    expect(qa.sceneChecks).toHaveLength(storyboard.scenes.length);
    for (const scene of storyboard.scenes) {
      const sceneQa = qa.sceneChecks.find((row) => row.sceneId === scene.sceneId);
      expect(sceneQa).toBeDefined();
      expect(sceneQa?.checks.length).toBeGreaterThan(0);
    }
  });

  it("QA approval gate defaults to not-reviewed", () => {
    const pipeline = buildBenchPressExerciseProductPipeline();
    expect(pipeline.qaChecklist.packageStatus).toBe("not-reviewed");
    expect(pipeline.qaChecklist.approvalGate.status).toBe("not-reviewed");
    expect(pipeline.qaChecklist.approvalGate.canApprove).toBe(false);
    const allChecks = [
      ...pipeline.qaChecklist.sceneChecks.flatMap((scene) => scene.checks),
      ...pipeline.qaChecklist.packageChecks,
    ];
    expect(allChecks.every((item) => item.status === "not-reviewed")).toBe(true);
  });

  it("pipeline timeline compatibility passes", () => {
    const pipeline = buildBenchPressExerciseProductPipeline();
    expect(pipeline.timelineCompatibility.passes).toBe(true);
    expect(pipeline.timelineCompatibility.sceneCountMatches).toBe(true);
    expect(pipeline.timelineCompatibility.slotIdsMatch).toBe(true);
    expect(pipeline.timelineCompatibility.totalDurationMatches).toBe(true);
  });

  it("output is deterministic", () => {
    const first = buildBenchPressExerciseProductPipeline();
    const second = buildBenchPressExerciseProductPipeline();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("isBenchPressProductExercise identifies bench_press only", () => {
    expect(isBenchPressProductExercise("bench_press")).toBe(true);
    expect(isBenchPressProductExercise("squat")).toBe(false);
    expect(isBenchPressProductExercise(undefined)).toBe(false);
  });
});

describe("bench press payload product refs", () => {
  it("includes compact product refs for bench_press", () => {
    const payload = buildMediaExperiencePayloadRef({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      composer: buildDefaultMediaComposerState("bench_press"),
    });
    expect(payload.exerciseProductVersion).toBe(BENCH_PRESS_PRODUCT_VERSION);
    expect(payload.productionBriefVersion).toBe(BENCH_PRESS_BRIEF_VERSION);
    expect(payload.qaVersion).toBe(BENCH_PRESS_QA_VERSION);
    expect(payload.assetStatus).toBe("placeholder-only");
    expect(payload.mediaAssetManifestVersion).toBe("bench-press-media-assets-v1");
    expect(payload.approvedVideoAssetCount).toBe(0);
  });

  it("does not include product refs for non-bench exercises", () => {
    const payload = buildMediaExperiencePayloadRef({
      exerciseId: "squat",
      exerciseName: "Squat",
      composer: buildDefaultMediaComposerState("squat"),
    });
    expect(payload.exerciseProductVersion).toBeUndefined();
    expect(payload.productionBriefVersion).toBeUndefined();
    expect(payload.qaVersion).toBeUndefined();
    expect(payload.assetStatus).toBeUndefined();
  });
});
