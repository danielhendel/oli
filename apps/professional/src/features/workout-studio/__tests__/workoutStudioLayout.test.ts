import fs from "node:fs";
import path from "node:path";

import {
  BUILDER_NAV_SECTIONS,
  WORKOUT_STUDIO_MODE_IDS,
  WORKOUT_STUDIO_MODES,
} from "../workoutStudioNavigation";

describe("workout studio layout structure", () => {
  it("defines three primary studio modes", () => {
    expect(WORKOUT_STUDIO_MODE_IDS).toEqual(["overview", "stats", "blocks"]);
    expect(WORKOUT_STUDIO_MODES).toHaveLength(3);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.label)).toEqual([
      "Overview",
      "Workout Stats",
      "Blocks",
    ]);
  });

  it("treats save, assign, and preview as actions rather than nav modes", () => {
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("save");
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("assign");
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("preview");
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("library");
  });

  it("keeps legacy scroll sections deprecated but available for reference", () => {
    expect(BUILDER_NAV_SECTIONS).toContain("overview");
    expect(BUILDER_NAV_SECTIONS).toContain("projectedVolume");
    expect(BUILDER_NAV_SECTIONS).toContain("blocks");
    expect(BUILDER_NAV_SECTIONS).toContain("library");
    expect(BUILDER_NAV_SECTIONS).toHaveLength(7);
  });
});

describe("simplified workout studio shell", () => {
  const componentsDir = path.join(__dirname, "../../../components/workout-studio");
  const pageContentPath = path.join(
    __dirname,
    "../../../app/studio/workouts/new/NewWorkoutStudioPageContent.tsx",
  );

  it("renders three mode nav options in WorkoutBuilderNavigator", () => {
    const content = fs.readFileSync(path.join(componentsDir, "WorkoutBuilderNavigator.tsx"), "utf8");
    expect(content).toMatch(/WORKOUT_STUDIO_MODES\.map/);
    expect(content).not.toMatch(/Exercise Library/);
    expect(content).not.toMatch(/Notes \/ Tools/);
    expect(content).not.toMatch(/onPreview/);
  });

  it("renders Preview, Save, and Assign in WorkoutStudioHeader", () => {
    const content = fs.readFileSync(path.join(componentsDir, "WorkoutStudioHeader.tsx"), "utf8");
    expect(content).toMatch(/Workout Design Studio/);
    expect(content).toMatch(/Preview/);
    expect(content).toMatch(/Save/);
    expect(content).toMatch(/Assign/);
    expect(content).toMatch(/coach library save arrives in UX-5/);
    expect(content).toMatch(/Assignment flow arrives in UX-6/);
    expect(content).not.toMatch(/Workout experiences/);
    expect(content).not.toMatch(/Local draft/);
    expect(content).not.toMatch(/Canonical IDs preserved/);
    expect(content).not.toMatch(/localStorage/);
    expect(content).not.toMatch(/firestore/i);
  });

  it("shows library only in Blocks mode in page shell", () => {
    const content = fs.readFileSync(pageContentPath, "utf8");
    expect(content).toMatch(/isBlocksMode/);
    expect(content).toMatch(/studio-library-column/);
    expect(content).toMatch(/WorkoutOverviewPanel/);
    expect(content).toMatch(/WorkoutStatsPanel/);
    expect(content).toMatch(/WorkoutBlocksPanel/);
    expect(content).not.toMatch(/WorkoutAuthorCanvas/);
  });

  it("uses prescription rows and thumbnail resolver in blocks builder", () => {
    const blockCard = fs.readFileSync(
      path.join(componentsDir, "WorkoutBlockCard.tsx"),
      "utf8",
    );
    const libraryPanel = fs.readFileSync(
      path.join(componentsDir, "WorkoutLibraryPanel.tsx"),
      "utf8",
    );
    expect(blockCard).toMatch(/WorkoutExercisePrescriptionRow/);
    expect(libraryPanel).toMatch(/resolveExerciseThumbnail/);
  });
});
