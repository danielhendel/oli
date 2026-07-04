import fs from "node:fs";
import path from "node:path";

import {
  WORKOUT_STUDIO_MODES,
  type WorkoutStudioMode,
} from "../workoutStudioNavigation";

describe("WorkoutBuilderTabs", () => {
  const tabsPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutBuilderTabs.tsx",
  );

  it("renders Overview, Workout Stats, and Workout tabs", () => {
    const content = fs.readFileSync(tabsPath, "utf8");
    expect(content).toMatch(/WORKOUT_STUDIO_MODES\.map/);
    expect(content).toMatch(/role="tablist"/);
    expect(content).toMatch(/aria-selected=\{isActive\}/);
    expect(content).toMatch(/onModeChange\(mode\.id\)/);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.label)).toEqual([
      "Overview",
      "Workout Stats",
      "Workout",
    ]);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.id)).toEqual([
      "overview",
      "stats",
      "blocks",
    ] satisfies WorkoutStudioMode[]);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.label)).not.toContain("Blocks");
  });

  it("is the first visible studio control in the page shell", () => {
    const pageContentPath = path.join(
      __dirname,
      "../../../app/studio/workouts/new/NewWorkoutStudioPageContent.tsx",
    );
    const content = fs.readFileSync(pageContentPath, "utf8");
    const tabsIndex = content.indexOf("<WorkoutBuilderTabs");
    const workspaceIndex = content.indexOf("studioWorkspaceTwoColumn");
    expect(tabsIndex).toBeGreaterThan(-1);
    expect(workspaceIndex).toBeGreaterThan(tabsIndex);
  });
});
