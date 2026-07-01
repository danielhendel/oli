import fs from "node:fs";
import path from "node:path";

describe("WorkoutBlocksPanel design", () => {
  const panelPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutBlocksPanel.tsx",
  );

  it("shows simplified blocks heading only", () => {
    const content = fs.readFileSync(panelPath, "utf8");
    expect(content).toMatch(/Build your workout/);
    expect(content).not.toMatch(/panelEyebrow/);
    expect(content).not.toMatch(
      /Add exercises from the library, then edit sets, reps, RPE, rest, and tempo directly/,
    );
  });
});
