import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("WorkoutLibraryPanel", () => {
  const libraryPanelPath = join(
    __dirname,
    "../../../components/workout-studio/WorkoutLibraryPanel.tsx",
  );
  const createExercisePath = join(
    __dirname,
    "../createWorkoutStudioExerciseFromLibraryExercise.ts",
  );

  it("supports card and list view toggle in source", () => {
    const source = readFileSync(libraryPanelPath, "utf8");

    expect(source).toContain('useState<LibraryViewMode>("card")');
    expect(source).toContain('viewMode === "list"');
    expect(source).toContain("Cards");
    expect(source).toContain("List");
  });

  it("preserves canonical exerciseId when adding from library", () => {
    const draftSource = readFileSync(createExercisePath, "utf8");

    expect(draftSource).toContain("exerciseId: libraryExercise.exerciseId");
    expect(draftSource).toContain('source: "canonical"');
  });

  it("renders simplified visual exercise cards", () => {
    const source = readFileSync(libraryPanelPath, "utf8");

    expect(source).toMatch(/cardTitle/);
    expect(source).toMatch(/cardImageWrap/);
    expect(source).toMatch(/size="libraryCard"/);
    expect(source).toMatch(/dragHandle/);
    expect(source).toMatch(/addButton/);
    expect(source).not.toMatch(/intelBadge/);
    expect(source).not.toMatch(/Why use it\?/);
    expect(source).not.toMatch(/cardMeta/);
    expect(source).not.toMatch(/tagMono/);
    expect(source).not.toMatch(/hasExerciseAcademyIntelligence/);
  });

  it("uses an independently scrollable results area with visible filter chips", () => {
    const source = readFileSync(libraryPanelPath, "utf8");
    const css = readFileSync(
      join(__dirname, "../../../components/workout-studio/WorkoutLibraryPanel.module.css"),
      "utf8",
    );

    expect(source).toMatch(/libraryResults/);
    expect(source).toMatch(/aria-label="Exercise library results"/);
    expect(source).toMatch(/aria-label="Workout library"/);
    expect(source).toMatch(/WORKOUT_LIBRARY_FILTERS/);
    expect(css).toMatch(/\.libraryResults/);
    expect(css).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(/\.libraryControls/);
    expect(css).toMatch(/\.chips/);
    expect(css).toMatch(/\.chips\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.chips\s*\{[^}]*overflow:\s*visible/);
  });

  it("uses compact library header without palette title or selected-block helper copy", () => {
    const source = readFileSync(libraryPanelPath, "utf8");
    const css = readFileSync(
      join(__dirname, "../../../components/workout-studio/WorkoutLibraryPanel.module.css"),
      "utf8",
    );

    expect(source).not.toMatch(/Exercise palette/);
    expect(source).not.toMatch(/Adding to selected block/);
    expect(source).not.toMatch(/Select a block to add exercises/);
    expect(source).toMatch(/Search workout library/);
    expect(source).toMatch(/disabled=\{!selectedBlockId\}/);
    expect(css).toMatch(/gap:\s*8px/);
    expect(css).toMatch(/\.toolbar\s*\{[^}]*gap:\s*6px/);
  });
});
