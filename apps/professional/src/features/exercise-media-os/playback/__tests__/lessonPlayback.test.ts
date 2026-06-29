import { buildDefaultMediaComposerState, mergeMediaComposerState } from "../../buildMediaComposerState";
import { buildBenchPressExerciseProductPipeline } from "../../bench-press-product/buildBenchPressExerciseProductPipeline";
import {
  BENCH_PRESS_PILOT_ENABLED_SLOTS,
  buildBenchPressPilotMasterMediaPackage,
} from "../../data/benchPressMasterMediaPackage";
import {
  buildBenchPressLessonPlaybackPlan,
  resolveLessonPlaybackPlan,
} from "../buildLessonPlaybackPlan";
import {
  buildLessonPlaybackProgress,
  getNextPlaybackScene,
  getPreviousPlaybackScene,
  getPlaybackSceneById,
} from "../buildLessonPlaybackProgress";
import { LESSON_PLAYBACK_VERSION } from "../types";

function buildSamplePlan(coachMessage = "") {
  const pipeline = buildBenchPressExerciseProductPipeline();
  const mediaPackage = buildBenchPressPilotMasterMediaPackage();
  const composer = mergeMediaComposerState("bench_press", { coachMessage });

  return buildBenchPressLessonPlaybackPlan({
    pipeline,
    mediaPackage,
    composer,
    clientGoal: "Primary Activation",
  });
}

describe("buildBenchPressLessonPlaybackPlan", () => {
  it("builds playback plan for bench_press", () => {
    const plan = buildSamplePlan();
    expect(plan.exerciseId).toBe("bench_press");
    expect(plan.playbackVersion).toBe(LESSON_PLAYBACK_VERSION);
    expect(plan.assetStatus).toBe("placeholder-only");
    expect(plan.approvedVideoAssetCount).toBe(0);
  });

  it("has 8 scenes in expected order", () => {
    const plan = buildSamplePlan();
    expect(plan.scenes).toHaveLength(8);
    expect(plan.scenes.map((scene) => scene.slotType)).toEqual(BENCH_PRESS_PILOT_ENABLED_SLOTS);
  });

  it("uses production brief narration and on-screen text", () => {
    const pipeline = buildBenchPressExerciseProductPipeline();
    const plan = buildSamplePlan();
    const heroScene = plan.scenes.find((scene) => scene.slotType === "heroDemo");
    const heroBrief = pipeline.productionBrief.scenes.find((scene) => scene.slotType === "heroDemo");

    expect(heroScene?.narrationScript).toBe(heroBrief?.narrationScript);
    expect(heroScene?.onScreenText).toBe(heroBrief?.onScreenText);
  });

  it("uses media package durations", () => {
    const mediaPackage = buildBenchPressPilotMasterMediaPackage();
    const plan = buildSamplePlan();
    const heroSlot = mediaPackage.slots.find((slot) => slot.slotType === "heroDemo");

    expect(plan.scenes.find((scene) => scene.slotType === "heroDemo")?.durationSeconds).toBe(
      heroSlot?.recommendedDurationSeconds,
    );
    expect(plan.totalDurationSeconds).toBe(
      plan.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    );
  });

  it("sets coach intro source to coach-custom when coach message exists", () => {
    const plan = buildSamplePlan("Today we prioritize controlled tempo on every rep.");
    const coachIntro = plan.scenes.find((scene) => scene.slotType === "coachIntro");

    expect(coachIntro?.source).toBe("coach-custom");
    expect(coachIntro?.coachMessage).toBe("Today we prioritize controlled tempo on every rep.");
    expect(plan.hasCoachMessage).toBe(true);
  });

  it("keeps coach intro source oli-master without coach message", () => {
    const plan = buildSamplePlan();
    const coachIntro = plan.scenes.find((scene) => scene.slotType === "coachIntro");

    expect(coachIntro?.source).toBe("oli-master");
    expect(coachIntro?.coachMessage).toBeUndefined();
    expect(plan.hasCoachMessage).toBe(false);
  });

  it("links next and previous scene ids", () => {
    const plan = buildSamplePlan();
    expect(plan.scenes[0]?.previousSceneId).toBeUndefined();
    expect(plan.scenes[0]?.nextSceneId).toBe(plan.scenes[1]?.sceneId);
    expect(plan.scenes[7]?.nextSceneId).toBeUndefined();
    expect(plan.scenes[7]?.previousSceneId).toBe(plan.scenes[6]?.sceneId);
  });

  it("output is deterministic", () => {
    const first = buildSamplePlan();
    const second = buildSamplePlan();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("resolveLessonPlaybackPlan", () => {
  it("returns null for non-bench exercises", () => {
    const plan = resolveLessonPlaybackPlan({
      exerciseId: "squat",
      exerciseName: "Squat",
      clientGoal: "Setup Precision",
      mediaComposer: buildDefaultMediaComposerState("squat"),
    });
    expect(plan).toBeNull();
  });

  it("resolves bench_press plan from exercise input", () => {
    const plan = resolveLessonPlaybackPlan({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      clientGoal: "Primary Activation",
      mediaComposer: buildDefaultMediaComposerState("bench_press"),
    });
    expect(plan?.exerciseId).toBe("bench_press");
    expect(plan?.scenes).toHaveLength(8);
  });
});

describe("lesson playback navigation and progress", () => {
  it("returns null previous for first scene", () => {
    const plan = buildSamplePlan();
    const first = plan.scenes[0]!;
    expect(getPreviousPlaybackScene(plan, first.sceneId)).toBeUndefined();
  });

  it("returns null next for last scene", () => {
    const plan = buildSamplePlan();
    const last = plan.scenes[plan.scenes.length - 1]!;
    expect(getNextPlaybackScene(plan, last.sceneId)).toBeUndefined();
  });

  it("navigates next and previous deterministically", () => {
    const plan = buildSamplePlan();
    const second = plan.scenes[1]!;
    const third = getNextPlaybackScene(plan, second.sceneId);
    expect(third?.sceneId).toBe(plan.scenes[2]?.sceneId);
    expect(getPreviousPlaybackScene(plan, third!.sceneId)?.sceneId).toBe(second.sceneId);
  });

  it("getPlaybackSceneById resolves scenes", () => {
    const plan = buildSamplePlan();
    const scene = getPlaybackSceneById(plan, plan.scenes[3]!.sceneId);
    expect(scene?.slotType).toBe("execution");
  });

  it("buildLessonPlaybackProgress is deterministic", () => {
    const plan = buildSamplePlan();
    const sceneId = plan.scenes[2]!.sceneId;
    const first = buildLessonPlaybackProgress(plan, sceneId, 10);
    const second = buildLessonPlaybackProgress(plan, sceneId, 10);

    expect(first).toEqual(second);
    expect(first.currentSceneIndex).toBe(2);
    expect(first.totalScenes).toBe(8);
    expect(first.percentComplete).toBeGreaterThan(0);
    expect(first.sceneProgressPercent).toBeGreaterThan(0);
  });

  it("computes total duration progress correctly at end", () => {
    const plan = buildSamplePlan();
    const lastScene = plan.scenes[plan.scenes.length - 1]!;
    const progress = buildLessonPlaybackProgress(plan, lastScene.sceneId, lastScene.durationSeconds);
    expect(progress.elapsedSeconds).toBe(plan.totalDurationSeconds);
    expect(progress.percentComplete).toBe(100);
  });
});
