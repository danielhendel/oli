import fs from "node:fs";
import path from "node:path";

describe("WorkoutExercisePrescriptionRow", () => {
  const componentPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutExercisePrescriptionRow.tsx",
  );

  it("renders two-card layout with inline prescription fields", () => {
    const content = fs.readFileSync(componentPath, "utf8");
    expect(content).toMatch(/visualCard/);
    expect(content).toMatch(/prescriptionCard/);
    expect(content).toMatch(/ExerciseThumbnail/);
    expect(content).toMatch(/size="lg"/);
    expect(content).toMatch(/setDetails/);
    expect(content).toMatch(/formatDesignedSetDetailLine/);
    expect(content).toMatch(/Sets/);
    expect(content).toMatch(/Reps/);
    expect(content).toMatch(/RPE/);
    expect(content).toMatch(/Rest \(s\)/);
    expect(content).toMatch(/Tempo/);
    expect(content).toMatch(/Customize/);
    expect(content).toMatch(/Delete/);
    expect(content).not.toMatch(/Open Experience/);
    expect(content).not.toMatch(/Approved master/);
  });

  it("uses immutable prescription update helpers", () => {
    const content = fs.readFileSync(componentPath, "utf8");
    expect(content).toMatch(/updateExercisePrescriptionFromRow/);
    expect(content).toMatch(/buildExercisePrescriptionRowSummary/);
  });
});
