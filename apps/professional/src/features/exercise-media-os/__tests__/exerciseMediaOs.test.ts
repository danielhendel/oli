import {
  BENCH_PRESS_BRIEF_VERSION,
  BENCH_PRESS_PRODUCT_VERSION,
  BENCH_PRESS_QA_VERSION,
} from "../bench-press-product/benchPressProductConstants";
import { buildExerciseMediaBlueprint } from "../buildExerciseMediaBlueprint";
import { buildClientMediaTimeline } from "../buildClientMediaTimeline";
import { buildMediaExperiencePayloadRef } from "../buildMediaExperiencePayloadRef";
import {
  applyMediaComposerPatch,
  buildDefaultMediaComposerState,
  mergeMediaComposerState,
} from "../buildMediaComposerState";
import {
  buildPlannedMasterMediaPackage,
  resolveMasterMediaPackage,
} from "../buildMasterMediaPackage";
import { buildMediaReadinessScore } from "../buildMediaReadinessScore";
import {
  buildBenchPressPilotMasterMediaPackage,
  BENCH_PRESS_PILOT_ENABLED_SLOTS,
} from "../data/benchPressMasterMediaPackage";
import {
  BENCH_PRESS_PILOT_PACKAGE_VERSION,
  CLIENT_TIMELINE_SLOT_ORDER,
  EXERCISE_MEDIA_BLUEPRINT_VERSION,
  MASTER_MEDIA_PACKAGE_VERSION,
  REQUIRED_SLOT_TYPES,
} from "../types";
import {
  getClientMediaTimelineById,
  getDefaultMediaComposerStateById,
  getExerciseMediaBlueprintById,
  getExerciseMediaReadinessById,
  getMasterMediaPackageById,
  getPlannedMasterMediaPackageById,
} from "../exerciseMediaRegistry";

describe("buildExerciseMediaBlueprint", () => {
  it("preserves canonical exerciseId", () => {
    const blueprint = buildExerciseMediaBlueprint({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
    });
    expect(blueprint.exerciseId).toBe("bench_press");
    expect(blueprint.blueprintVersion).toBe(EXERCISE_MEDIA_BLUEPRINT_VERSION);
  });

  it("defines required slots", () => {
    const blueprint = buildExerciseMediaBlueprint({
      exerciseId: "squat",
      exerciseName: "Squat",
    });
    expect(blueprint.requiredSlots.map((slot) => slot.slotType)).toEqual(REQUIRED_SLOT_TYPES);
    expect(blueprint.requiredSlots.every((slot) => slot.required)).toBe(true);
  });
});

describe("buildPlannedMasterMediaPackage", () => {
  it("returns planned status and deterministic duration for non-pilot exercises", () => {
    const blueprint = buildExerciseMediaBlueprint({
      exerciseId: "deadlift",
      exerciseName: "Deadlift",
    });
    const first = buildPlannedMasterMediaPackage(blueprint);
    const second = buildPlannedMasterMediaPackage(blueprint);
    expect(first.status).toBe("planned");
    expect(first.packageVersion).toBe(MASTER_MEDIA_PACKAGE_VERSION);
    expect(first.estimatedDurationSeconds).toBeGreaterThan(0);
    expect(first).toEqual(second);
  });
});

describe("bench press pilot master media package", () => {
  it("returns complete pilot package with approved slots", () => {
    const pilot = buildBenchPressPilotMasterMediaPackage();
    expect(pilot.exerciseId).toBe("bench_press");
    expect(pilot.packageVersion).toBe(BENCH_PRESS_PILOT_PACKAGE_VERSION);
    expect(pilot.status).toBe("complete");
    expect(pilot.slots.every((slot) => slot.status === "approved")).toBe(true);
    expect(pilot.slots.map((slot) => slot.slotType)).toEqual(BENCH_PRESS_PILOT_ENABLED_SLOTS);
    expect(pilot.estimatedDurationSeconds).toBe(290);
  });

  it("resolves pilot package for bench_press via registry", () => {
    const mediaPackage = getMasterMediaPackageById("bench_press");
    expect(mediaPackage?.packageVersion).toBe(BENCH_PRESS_PILOT_PACKAGE_VERSION);
    expect(mediaPackage?.status).toBe("complete");
  });

  it("returns planned package for non-bench exercises", () => {
    const squat = getMasterMediaPackageById("squat");
    expect(squat?.packageVersion).toBe(MASTER_MEDIA_PACKAGE_VERSION);
    expect(squat?.status).toBe("planned");
    expect(squat?.slots.every((slot) => slot.status === "planned")).toBe(true);
  });

  it("scores bench_press readiness as ready/high", () => {
    const readiness = getExerciseMediaReadinessById("bench_press");
    expect(readiness?.status).toBe("ready");
    expect(readiness?.score).toBeGreaterThanOrEqual(90);
    expect(readiness?.approvedSlots).toBe(BENCH_PRESS_PILOT_ENABLED_SLOTS.length);
  });

  it("uses pilot durations in client timeline", () => {
    const mediaPackage = resolveMasterMediaPackage(
      buildExerciseMediaBlueprint({
        exerciseId: "bench_press",
        exerciseName: "Bench Press",
      }),
    );
    const composer = mergeMediaComposerState("bench_press", {
      enabledSlots: [...BENCH_PRESS_PILOT_ENABLED_SLOTS],
    });
    const timeline = buildClientMediaTimeline(mediaPackage, composer);
    expect(timeline.totalDurationSeconds).toBe(290);
    expect(timeline.items.map((item) => item.slotType)).toEqual(BENCH_PRESS_PILOT_ENABLED_SLOTS);
    expect(timeline.items[1]?.durationSeconds).toBe(52);
  });

  it("changes coachIntro source to coach-custom when coach message exists", () => {
    const timeline = getClientMediaTimelineById("bench_press", {
      coachMessage: "Own the eccentric today.",
    });
    const coachIntro = timeline?.items.find((item) => item.slotType === "coachIntro");
    expect(coachIntro?.source).toBe("coach-custom");
  });

  it("includes pilot packageVersion in payload mediaExperience", () => {
    const payload = buildMediaExperiencePayloadRef({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      composer: buildDefaultMediaComposerState("bench_press"),
    });
    expect(payload.masterPackageVersion).toBe(BENCH_PRESS_PILOT_PACKAGE_VERSION);
    expect(payload.timelineItemCount).toBe(BENCH_PRESS_PILOT_ENABLED_SLOTS.length);
    expect(payload.estimatedDurationSeconds).toBe(290);
  });

  it("does not require real media URLs on pilot slots", () => {
    const pilot = buildBenchPressPilotMasterMediaPackage();
    for (const slot of pilot.slots) {
      expect(slot.assetKind).toMatch(/^placeholder-/);
      expect(slot.placeholderVisualLabel).toBeTruthy();
      expect(slot.clientPurpose).toBeTruthy();
    }
  });
});

describe("buildDefaultMediaComposerState", () => {
  it("defaults to technical/intermediate with required enabled slots for generic exercises", () => {
    const composer = buildDefaultMediaComposerState("squat");
    expect(composer.selectedTeachingStyle).toBe("technical");
    expect(composer.selectedDifficulty).toBe("intermediate");
    expect(composer.selectedTodayFocus).toBe("setup");
    expect(composer.selectedVisualEmphasis).toBe("primaryMuscles");
    expect(composer.enabledSlots).toEqual(REQUIRED_SLOT_TYPES);
  });

  it("enables full pilot timeline slots for bench_press", () => {
    const composer = buildDefaultMediaComposerState("bench_press");
    expect(composer.selectedTodayFocus).toBe("primaryMuscles");
    expect(composer.enabledSlots).toEqual(BENCH_PRESS_PILOT_ENABLED_SLOTS);
  });
});

describe("buildClientMediaTimeline", () => {
  it("orders timeline items deterministically", () => {
    const blueprint = buildExerciseMediaBlueprint({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
    });
    const mediaPackage = buildPlannedMasterMediaPackage(blueprint);
    const composer = mergeMediaComposerState("bench_press", {
      enabledSlots: [...CLIENT_TIMELINE_SLOT_ORDER],
    });
    const timeline = buildClientMediaTimeline(mediaPackage, composer);
    const order = timeline.items.map((item) => item.slotType);
    expect(order).toEqual([
      "coachIntro",
      "heroDemo",
      "setup",
      "execution",
      "commonMistake",
      "slowMotion",
      "muscleOverlay",
      "reflection",
    ]);
  });

  it("uses coach-custom source when coach message exists for coach intro", () => {
    const blueprint = buildExerciseMediaBlueprint({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
    });
    const mediaPackage = resolveMasterMediaPackage(blueprint);
    const composer = mergeMediaComposerState("bench_press", {
      coachMessage: "Focus on controlled tempo today.",
    });
    const timeline = buildClientMediaTimeline(mediaPackage, composer);
    const coachIntro = timeline.items.find((item) => item.slotType === "coachIntro");
    expect(coachIntro?.source).toBe("coach-custom");
  });

  it("updates composer via patch without mutating original", () => {
    const composer = buildDefaultMediaComposerState("bench_press");
    const patched = applyMediaComposerPatch(composer, {
      selectedTeachingStyle: "motivational",
    });
    expect(patched.selectedTeachingStyle).toBe("motivational");
    expect(composer.selectedTeachingStyle).toBe("technical");
  });
});

describe("buildMediaReadinessScore", () => {
  it("scores planned required slots as planned readiness", () => {
    const blueprint = buildExerciseMediaBlueprint({
      exerciseId: "squat",
      exerciseName: "Squat",
    });
    const mediaPackage = buildPlannedMasterMediaPackage(blueprint);
    const readiness = buildMediaReadinessScore(mediaPackage);
    expect(readiness.status).toBe("planned");
    expect(readiness.missingRequiredSlots).toEqual([]);
    expect(readiness.plannedSlots).toBeGreaterThan(0);
    expect(readiness.recommendations.length).toBeGreaterThan(0);
  });
});

describe("exerciseMediaRegistry", () => {
  it("looks up blueprint and package by canonical exerciseId", () => {
    const blueprint = getExerciseMediaBlueprintById("bench_press");
    const mediaPackage = getPlannedMasterMediaPackageById("bench_press");
    expect(blueprint?.exerciseId).toBe("bench_press");
    expect(mediaPackage?.exerciseId).toBe("bench_press");
  });

  it("builds default composer and timeline via registry", () => {
    const composer = getDefaultMediaComposerStateById("bench_press");
    const timeline = getClientMediaTimelineById("bench_press");
    const readiness = getExerciseMediaReadinessById("bench_press");
    expect(composer.exerciseId).toBe("bench_press");
    expect(timeline?.items.length).toBe(BENCH_PRESS_PILOT_ENABLED_SLOTS.length);
    expect(readiness?.score).toBeGreaterThan(90);
  });
});

describe("buildMediaExperiencePayloadRef", () => {
  it("includes compact mediaExperience fields for planned exercises", () => {
    const payload = buildMediaExperiencePayloadRef({
      exerciseId: "squat",
      exerciseName: "Squat",
      composer: buildDefaultMediaComposerState("squat"),
    });
    expect(payload.mediaBlueprintVersion).toBe(EXERCISE_MEDIA_BLUEPRINT_VERSION);
    expect(payload.masterPackageVersion).toBe(MASTER_MEDIA_PACKAGE_VERSION);
    expect(payload.selectedTeachingStyle).toBe("technical");
    expect(payload.timelineItemCount).toBeGreaterThan(0);
    expect(payload.estimatedDurationSeconds).toBeGreaterThan(0);
    expect(payload.hasCoachMessage).toBe(false);
    expect(payload.exerciseProductVersion).toBeUndefined();
  });

  it("includes bench press product pipeline refs without large brief payload", () => {
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
    expect(Object.keys(payload)).not.toContain("productionBrief");
    expect(Object.keys(payload)).not.toContain("storyboard");
  });
});
