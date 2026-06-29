import fs from "node:fs";
import path from "node:path";

import { buildExerciseAcademyEntryFromCanonicalExercise } from "../buildExerciseAcademyEntry";
import { buildExerciseLessonModules } from "../buildExerciseLessonModules";
import { buildExerciseMediaPlan } from "../buildExerciseMediaPlan";
import { buildExerciseKnowledgeQuality } from "../buildExerciseKnowledgeQuality";
import {
  buildExerciseAcademyPayloadRef,
  buildExerciseAcademyPayloadRefForExerciseId,
} from "../exerciseAcademyAdapter";
import { buildAcademyBackedExerciseDesignDefaults } from "../buildExerciseAcademyDesignDefaults";
import { buildTeachingFromLibrary } from "../exerciseAcademyDefaults";
import { EXERCISE_ACADEMY_VERSION } from "../types";
import { createDefaultExerciseDetails } from "../../workout-studio/exerciseDefaults";
import { buildAppWorkoutDraftPayload } from "../../workout-studio/buildAppWorkoutDraftPayload";
import { seedSampleWorkout } from "../../workout-studio/workoutStudioDraft";
import { listCanonicalWorkoutLibraryExercises } from "../../workout-studio/exerciseLibraryAdapter";

describe("buildExerciseAcademyEntryFromCanonicalExercise", () => {
  const bench = listCanonicalWorkoutLibraryExercises().find(
    (item) => item.exerciseId === "bench_press",
  );

  it("preserves canonical exerciseId", () => {
    expect(bench).toBeDefined();
    const entry = buildExerciseAcademyEntryFromCanonicalExercise(bench!);
    expect(entry.exerciseId).toBe("bench_press");
    expect(entry.identity.exerciseId).toBe("bench_press");
    expect(entry.source).toBe("canonical");
    expect(entry.version).toBe(EXERCISE_ACADEMY_VERSION);
  });

  it("returns deterministic output for the same input", () => {
    const first = buildExerciseAcademyEntryFromCanonicalExercise(bench!);
    const second = buildExerciseAcademyEntryFromCanonicalExercise(bench!);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("handles missing library description safely", () => {
    const minimal = {
      ...bench!,
      description: "",
      cues: [],
      primaryMuscles: [],
    };
    const entry = buildExerciseAcademyEntryFromCanonicalExercise(minimal);
    expect(entry.teaching.overview.length).toBeGreaterThan(0);
    expect(entry.teaching.setup.length).toBeGreaterThan(0);
    expect(entry.quality.score).toBeGreaterThan(0);
  });
});

describe("buildExerciseLessonModules", () => {
  it("generates modules in expected order", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    )!;
    const entry = buildExerciseAcademyEntryFromCanonicalExercise(bench);
    const modules = buildExerciseLessonModules(entry);
    expect(modules.map((module) => module.title)).toEqual([
      "Overview",
      "Setup",
      "Execution",
      "Coaching Cues",
      "Common Mistakes",
      "What You Should Feel",
      "Progression",
      "Reflection",
    ]);
    expect(modules).toHaveLength(8);
  });
});

describe("buildExerciseMediaPlan", () => {
  it("defines planned media slots", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    )!;
    const teaching = buildTeachingFromLibrary(bench);
    const plan = buildExerciseMediaPlan({
      exerciseId: bench.exerciseId,
      exerciseName: bench.name,
      teaching,
    });
    expect(plan.heroDemo.status).toBe("planned");
    expect(plan.setupClip.status).toBe("planned");
    expect(plan.executionClip.status).toBe("planned");
    expect(plan.slowMotionClip.status).toBe("planned");
    expect(plan.angleClips.map((slot) => slot.slotId)).toEqual([
      "front-angle",
      "side-angle",
      "close-up",
    ]);
    expect(plan.coachCustomSlots.map((slot) => slot.slotId)).toEqual([
      "coach-intro-custom",
      "coach-note-custom",
    ]);
    expect(plan.status).toBe("planned");
  });
});

describe("buildExerciseKnowledgeQuality", () => {
  it("increases score with complete starter content", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    )!;
    const entry = buildExerciseAcademyEntryFromCanonicalExercise(bench);
    expect(entry.quality.score).toBe(100);
    expect(entry.quality.hasOverview).toBe(true);
    expect(entry.quality.hasMediaPlan).toBe(true);
  });

  it("reports missing items when teaching is empty", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    )!;
    const entry = buildExerciseAcademyEntryFromCanonicalExercise(bench);
    const quality = buildExerciseKnowledgeQuality({
      teaching: {
        ...entry.teaching,
        overview: "",
        setup: "",
        execution: "",
        coachingCues: [],
        commonMistakes: [],
        shouldFeel: [],
      },
      programming: {
        ...entry.programming,
        progressionOptions: [],
      },
      mediaPlan: {
        ...entry.mediaPlan,
        status: "missing",
      },
    });
    expect(quality.score).toBeLessThan(100);
    expect(quality.missingItems.length).toBeGreaterThan(0);
  });
});

describe("createDefaultExerciseDetails academy integration", () => {
  it("pulls coaching defaults from academy entry", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    )!;
    const academy = buildAcademyBackedExerciseDesignDefaults(bench);
    const details = createDefaultExerciseDetails(bench);
    expect(details.design.whyThisExercise).toBe(academy.design.whyThisExercise);
    expect(details.design.setupInstructions).toBe(academy.design.setupInstructions);
    expect(details.design.executionInstructions).toBe(academy.design.executionInstructions);
    expect(details.design.coachingCues.length).toBeGreaterThan(0);
    expect(details.progressionRules.length).toBeGreaterThan(0);
  });
});

describe("buildAppWorkoutDraftPayload academy reference", () => {
  it("includes compact academy reference for canonical exercises", () => {
    const payload = buildAppWorkoutDraftPayload(seedSampleWorkout());
    const exercise = payload.blocks[0]?.exercises[0];
    expect(exercise?.exerciseAcademy).toBeDefined();
    expect(exercise?.exerciseAcademy?.exerciseId).toBe("bench_press");
    expect(exercise?.exerciseAcademy?.academyVersion).toBe(EXERCISE_ACADEMY_VERSION);
    expect(exercise?.exerciseAcademy?.qualityScore).toBeGreaterThan(0);
    expect(exercise?.exerciseAcademy?.lessonModuleCount).toBe(8);
    expect(exercise?.exerciseAcademy?.mediaPlanStatus).toBe("planned");
  });

  it("buildExerciseAcademyPayloadRef stays compact", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    )!;
    const entry = buildExerciseAcademyEntryFromCanonicalExercise(bench);
    const modules = buildExerciseLessonModules(entry);
    const ref = buildExerciseAcademyPayloadRef(entry, modules);
    const serialized = JSON.stringify(ref);
    expect(serialized.length).toBeLessThan(600);
    expect(ref.lessonModuleTypes).toContain("overview");
  });

  it("returns null academy ref for unknown exerciseId", () => {
    const ref = buildExerciseAcademyPayloadRefForExerciseId("unknown_exercise", []);
    expect(ref).toBeNull();
  });
});

describe("exercise academy boundaries", () => {
  it("does not import react-native or backend modules", () => {
    const featureDir = path.join(__dirname, "..");
    const files = fs.readdirSync(featureDir).filter((file) => file.endsWith(".ts"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(featureDir, file), "utf8");
      expect(content).not.toMatch(/from ["']react-native["']/);
      expect(content).not.toMatch(/firebase|firestore/i);
    }
  });
});
