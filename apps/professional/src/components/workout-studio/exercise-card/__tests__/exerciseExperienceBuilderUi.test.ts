import {
  buildLessonNarrativeScenes,
  EXPERIENCE_ROADMAP_CARDS,
  formatExperienceDuration,
  resolveSelectedGoal,
  teachingStyleLabel,
} from "../exerciseExperienceBuilderUi";
import { buildFocusCardsForExercise } from "../mediaLessonDirectorUi";

describe("exerciseExperienceBuilderUi", () => {
  it("resolves selected goal from focus cards with fallback", () => {
    const cards = buildFocusCardsForExercise("Bench Press", ["Chest"]);
    const goal = resolveSelectedGoal(cards, "primaryMuscles");
    expect(goal.title).toBe("Chest Activation");

    const fallback = resolveSelectedGoal([], "unknown");
    expect(fallback.title).toBe("Movement Quality");
  });

  it("builds narrative scenes starting with goal then ordered lesson beats", () => {
    const cards = buildFocusCardsForExercise("Bench Press", ["Chest"]);
    const goal = resolveSelectedGoal(cards, "primaryMuscles");

    const scenes = buildLessonNarrativeScenes({
      goal,
      timelineItems: [
        {
          itemId: "item-coach",
          slotId: "slot-coach",
          slotType: "coachIntro",
          type: "coachIntro",
          title: "Coach Intro",
          clientPurpose: "Set intent for the session.",
          durationSeconds: 12,
          source: "coach-custom",
        },
        {
          itemId: "item-demo",
          slotId: "slot-demo",
          slotType: "heroDemo",
          type: "heroDemo",
          title: "Hero Demo",
          clientPurpose: "See the full movement.",
          durationSeconds: 30,
          source: "oli-master",
        },
        {
          itemId: "item-setup",
          slotId: "slot-setup",
          slotType: "setup",
          type: "setup",
          title: "Setup",
          clientPurpose: "Find your starting position.",
          durationSeconds: 20,
          source: "oli-master",
        },
      ],
      activeSceneId: "item-demo",
    });

    expect(scenes[0]?.sceneKey).toBe("goal");
    expect(scenes[0]?.title).toBe("Goal");
    expect(scenes.map((scene) => scene.title)).toEqual([
      "Goal",
      "Coach Introduction",
      "Movement Demonstration",
      "Setup",
    ]);
    expect(scenes.find((scene) => scene.id === "item-demo")?.previewState).toBe("active");
  });

  it("includes five M3 roadmap capabilities", () => {
    expect(EXPERIENCE_ROADMAP_CARDS).toHaveLength(5);
    expect(EXPERIENCE_ROADMAP_CARDS.map((card) => card.title)).toEqual([
      "AI Lesson Generation",
      "Coach Video",
      "Voice Cloning",
      "Motion Graphics",
      "Adaptive Playback",
    ]);
  });

  it("formats experience durations for timeline cards", () => {
    expect(formatExperienceDuration(45)).toBe("45s");
    expect(formatExperienceDuration(90)).toBe("1:30");
    expect(formatExperienceDuration(120)).toBe("2 min");
  });

  it("formats teaching style labels for display", () => {
    expect(teachingStyleLabel("rehab-aware")).toBe("Rehab Aware");
  });
});
