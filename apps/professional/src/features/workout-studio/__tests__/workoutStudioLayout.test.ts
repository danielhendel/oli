import fs from "node:fs";
import path from "node:path";

import {
  BUILDER_NAV_SECTIONS,
  WORKOUT_STUDIO_MODE_IDS,
  WORKOUT_STUDIO_MODES,
} from "../workoutStudioNavigation";

describe("workout studio layout structure", () => {
  it("defines three primary studio modes with Workout tab label", () => {
    expect(WORKOUT_STUDIO_MODE_IDS).toEqual(["overview", "stats", "blocks"]);
    expect(WORKOUT_STUDIO_MODES).toHaveLength(3);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.label)).toEqual([
      "Overview",
      "Workout Stats",
      "Workout",
    ]);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.label)).not.toContain("Blocks");
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
  const pageCssPath = path.join(
    __dirname,
    "../../../app/studio/workouts/new/page.module.css",
  );

  it("renders horizontal WorkoutBuilderTabs instead of left navigator", () => {
    const content = fs.readFileSync(pageContentPath, "utf8");
    expect(content).toMatch(/WorkoutBuilderTabs/);
    expect(content).not.toMatch(/WorkoutBuilderNavigator/);
    expect(content).not.toMatch(/studio-nav-column/);
  });

  it("places Preview, Save, and Assign in the control row with tabs", () => {
    const content = fs.readFileSync(pageContentPath, "utf8");
    const headerSource = fs.readFileSync(
      path.join(componentsDir, "WorkoutStudioHeader.tsx"),
      "utf8",
    );
    expect(content).toMatch(/studioControlRow/);
    expect(content).toMatch(/WorkoutStudioActions/);
    expect(content).toMatch(/WorkoutBuilderTabs/);
    expect(content).toMatch(/WorkoutStudioHeader/);
    expect(content).toMatch(/aria-label="Workout studio controls"/);
    expect(headerSource).toMatch(/srOnly/);
    expect(headerSource).not.toMatch(/className=\{styles\.title\}/);
    expect(fs.readFileSync(path.join(componentsDir, "WorkoutStudioActions.tsx"), "utf8")).toMatch(
      /Preview/,
    );
    expect(fs.readFileSync(path.join(componentsDir, "WorkoutStudioActions.tsx"), "utf8")).toMatch(
      /Save/,
    );
    expect(fs.readFileSync(path.join(componentsDir, "WorkoutStudioActions.tsx"), "utf8")).toMatch(
      /Assign/,
    );
  });

  it("uses control row as first visible studio section without visible title block", () => {
    const content = fs.readFileSync(pageContentPath, "utf8");
    const headerIndex = content.indexOf("<WorkoutStudioHeader");
    const controlRowIndex = content.indexOf('className={styles.studioControlRow}');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(controlRowIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeGreaterThan(controlRowIndex);
  });

  it("uses padded two-column builder and wider library layout", () => {
    const content = fs.readFileSync(pageContentPath, "utf8");
    const css = fs.readFileSync(pageCssPath, "utf8");
    expect(content).toMatch(/studioWorkspaceTwoColumn/);
    expect(content).toMatch(/workoutBuilderColumn/);
    expect(content).toMatch(/exerciseLibraryColumn/);
    expect(content).toMatch(/studio-library-column/);
    expect(content).toMatch(/WorkoutOverviewPanel/);
    expect(content).toMatch(/WorkoutStatsPanel/);
    expect(content).toMatch(/WorkoutBlocksPanel/);
    expect(content).not.toMatch(/isBlocksMode/);
    expect(content).not.toMatch(/WorkoutAuthorCanvas/);
    expect(content).not.toMatch(/Build your workout/);
    expect(css).toMatch(/padding-left:\s*clamp\(16px, 3vw, 40px\)/);
    expect(css).toMatch(/\.studioControlRow/);
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) clamp\(360px, 28vw, 460px\)/);
    expect(css).toMatch(/align-items:\s*stretch/);
    expect(css).toMatch(/\.exerciseLibraryColumn[\s\S]*overflow:\s*hidden/);
    expect(css).toMatch(/\.workoutBuilderColumn[\s\S]*padding-bottom:\s*clamp\(96px, 12vh, 180px\)/);
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
    expect(libraryPanel).toMatch(/libraryResults/);
  });
});
