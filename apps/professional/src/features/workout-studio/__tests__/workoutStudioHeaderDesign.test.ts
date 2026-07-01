import fs from "node:fs";
import path from "node:path";

describe("WorkoutStudioHeader design", () => {
  const headerPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutStudioHeader.tsx",
  );

  it("shows Workout Design Studio with action buttons only", () => {
    const content = fs.readFileSync(headerPath, "utf8");
    expect(content).toMatch(/Workout Design Studio/);
    expect(content).toMatch(/Preview/);
    expect(content).toMatch(/Save/);
    expect(content).toMatch(/Assign/);
    expect(content).not.toMatch(/Workout experiences/);
    expect(content).not.toMatch(/Upper Body Strength/);
    expect(content).not.toMatch(/Local draft/);
    expect(content).not.toMatch(/Canonical IDs preserved/);
    expect(content).not.toMatch(/workoutTitle/);
  });
});
