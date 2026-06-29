import {
  EXERCISE_CARD_TABS,
  EXERCISE_CARD_TAB_HINTS,
  EXERCISE_CARD_TAB_LABELS,
} from "../../../components/workout-studio/exercise-card/types";
import { buildExerciseMediaTabCards } from "../../../components/workout-studio/exercise-card/exerciseMediaTabCards";
import { getExerciseAcademyEntryForLibraryExercise } from "../../exercise-academy/exerciseAcademyAdapter";
import { buildAppWorkoutDraftPayload } from "../buildAppWorkoutDraftPayload";
import { buildWorkoutProjectedVolume } from "../buildWorkoutProjectedVolume";
import { createDefaultDesignedSets } from "../exerciseDefaults";
import { linesFromItems, linesToItems, parseLines } from "../exerciseCardUtils";
import { listCanonicalWorkoutLibraryExercises } from "../exerciseLibraryAdapter";
import { seedSampleWorkout } from "../workoutStudioDraft";

describe("exercise card tabs", () => {
  it("defines six workspace tabs with Media after Sets and before Lesson", () => {
    expect(EXERCISE_CARD_TABS).toEqual([
      "sets",
      "media",
      "lesson",
      "coaching",
      "progression",
      "tracking",
    ]);
    expect(EXERCISE_CARD_TAB_LABELS.media).toBe("Media");
    expect(EXERCISE_CARD_TAB_LABELS.lesson).toBe("Lesson");
    expect(EXERCISE_CARD_TAB_HINTS.media).toBe("Design how your client learns this movement.");
    expect(EXERCISE_CARD_TAB_HINTS.lesson).toBe("Build the learning experience");
  });
});

describe("exercise media tab cards", () => {
  it("builds academy media slots including hero, angles, and coach video", () => {
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    expect(bench).toBeDefined();
    const entry = getExerciseAcademyEntryForLibraryExercise(bench!);
    const cards = buildExerciseMediaTabCards(entry);
    expect(cards.some((item) => item.title === "Hero Demo")).toBe(true);
    expect(cards.some((item) => item.title === "Coach Video")).toBe(true);
    expect(cards.some((item) => item.title === "Front angle")).toBe(true);
    expect(cards.every((item) => item.slot != null)).toBe(true);
  });

  it("returns placeholder media titles for custom exercises without academy entry", () => {
    const cards = buildExerciseMediaTabCards(null);
    expect(cards).toHaveLength(6);
    expect(cards.every((item) => item.slot == null)).toBe(true);
  });
});

describe("exerciseCardUtils", () => {
  it("converts multiline text to id items and back", () => {
    const items = linesToItems("Brace core\nControl tempo", "cue");
    expect(items).toHaveLength(2);
    expect(linesFromItems(items)).toBe("Brace core\nControl tempo");
  });

  it("parses trimmed lines", () => {
    expect(parseLines("  a \n\n b ")).toEqual(["a", "b"]);
  });
});

describe("exercise card compatibility", () => {
  it("preserves draft payload shape after card redesign", () => {
    const sample = seedSampleWorkout();
    const payload = buildAppWorkoutDraftPayload(sample);
    const exercise = payload.blocks[0]?.exercises[0];
    expect(exercise?.exerciseId).toBe("bench_press");
    expect(exercise?.designedSets.length).toBeGreaterThan(0);
    expect(exercise?.coachingPayload.whyThisExercise.length).toBeGreaterThan(0);
    expect(exercise?.exerciseAcademy?.academyVersion).toBe("academy-v1");
    expect(exercise?.mediaExperience?.mediaBlueprintVersion).toBe("blueprint-v1");
    expect(exercise?.mediaExperience?.timelineItemCount).toBeGreaterThan(0);
    expect(exercise?.loggingSchema.fields.length).toBeGreaterThan(0);
  });

  it("preserves projected volume from designed sets", () => {
    const sample = seedSampleWorkout();
    expect(buildWorkoutProjectedVolume(sample).totalSets).toBe(3);
  });

  it("preserves designed set operations", () => {
    const sets = createDefaultDesignedSets(3);
    expect(sets).toHaveLength(3);
    expect(sets[0]?.repRange).toBe("8-12");
  });
});
