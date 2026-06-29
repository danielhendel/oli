import {
  buildFocusCardsForExercise,
  readinessLabel,
  readinessStars,
  TEACHING_STYLE_CARDS,
  timelineDisplayTitle,
  VISUAL_EMPHASIS_CHIPS,
} from "../mediaLessonDirectorUi";

describe("mediaLessonDirectorUi", () => {
  it("builds press-specific focus cards for bench press", () => {
    const cards = buildFocusCardsForExercise("Bench Press", ["Chest"]);
    expect(cards.some((card) => card.title === "Chest Activation")).toBe(true);
    expect(cards.some((card) => card.title === "Shoulder Stability")).toBe(true);
  });

  it("maps teaching style cards to all composer styles", () => {
    expect(TEACHING_STYLE_CARDS.map((card) => card.style)).toEqual([
      "simple",
      "technical",
      "scientific",
      "athletic",
      "motivational",
      "rehab-aware",
    ]);
  });

  it("formats timeline display titles for lesson preview", () => {
    expect(timelineDisplayTitle("Common Mistake", "commonMistake")).toBe("Mistake");
    expect(timelineDisplayTitle("Muscle Overlay", "muscleOverlay")).toBe("Overlay");
  });

  it("derives readiness stars and label from score", () => {
    expect(readinessStars(85)).toBe(4);
    expect(readinessLabel(85)).toBe("Polished");
  });

  it("includes slow motion chip in visual emphasis options", () => {
    expect(VISUAL_EMPHASIS_CHIPS.some((chip) => chip.label === "Slow Motion")).toBe(true);
  });
});
