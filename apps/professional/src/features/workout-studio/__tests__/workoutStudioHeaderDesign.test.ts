import fs from "node:fs";
import path from "node:path";

describe("WorkoutStudioHeader design", () => {
  const headerPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutStudioHeader.tsx",
  );
  const headerCssPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutStudioHeader.module.css",
  );
  const actionsPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutStudioActions.tsx",
  );

  it("keeps Workout Design Studio as screen-reader-only, not visible title", () => {
    const content = fs.readFileSync(headerPath, "utf8");
    const css = fs.readFileSync(headerCssPath, "utf8");
    expect(content).toMatch(/Workout Design Studio/);
    expect(content).toMatch(/srOnly/);
    expect(content).not.toMatch(/className=\{styles\.title\}/);
    expect(css).toMatch(/\.srOnly/);
    expect(css).not.toMatch(/font-size:\s*clamp/);
    expect(content).not.toMatch(/Preview/);
    expect(content).not.toMatch(/Save/);
    expect(content).not.toMatch(/Assign/);
    expect(content).not.toMatch(/Workout experiences/);
    expect(content).not.toMatch(/Local draft/);
    expect(content).not.toMatch(/Canonical IDs preserved/);
  });

  it("keeps Preview, Save, and Assign in WorkoutStudioActions", () => {
    const content = fs.readFileSync(actionsPath, "utf8");
    expect(content).toMatch(/Preview/);
    expect(content).toMatch(/Save/);
    expect(content).toMatch(/Assign/);
    expect(content).toMatch(/coach library save arrives in UX-5/);
    expect(content).toMatch(/Assignment flow arrives in UX-6/);
  });
});
