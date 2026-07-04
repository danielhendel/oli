import { getExerciseOptionalDetailLinks } from "../getExerciseOptionalDetailLinks";

describe("getExerciseOptionalDetailLinks", () => {
  it("returns optional detail links for exercise experience tabs", () => {
    const links = getExerciseOptionalDetailLinks();
    expect(links.map((link) => link.label)).toEqual([
      "Media",
      "Lesson",
      "Coaching",
      "Progression",
      "Tracking",
    ]);
    expect(links.map((link) => link.tab)).toEqual([
      "media",
      "lesson",
      "coaching",
      "progression",
      "tracking",
    ]);
  });
});
