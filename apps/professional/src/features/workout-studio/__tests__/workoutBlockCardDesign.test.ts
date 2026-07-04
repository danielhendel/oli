import fs from "node:fs";
import path from "node:path";

describe("WorkoutBlockCard design", () => {
  const blockCardPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutBlockCard.tsx",
  );
  const blockCardCssPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutBlockCard.module.css",
  );

  it("uses premium type-only header with spaced action controls on the right", () => {
    const content = fs.readFileSync(blockCardPath, "utf8");
    const css = fs.readFileSync(blockCardCssPath, "utf8");
    expect(content).toMatch(/blockHeader/);
    expect(content).toMatch(/blockHeaderSurface/);
    expect(content).toMatch(/headerLeft/);
    expect(content).toMatch(/blockHeaderActions/);
    expect(content).toMatch(/blockMoveControls/);
    expect(content).toMatch(/blockMenuControl/);
    expect(content).toMatch(/headerSelect/);
    expect(content).toMatch(/menuButton/);
    expect(content).toMatch(/Move \$\{blockLabel\} up/);
    expect(content).toMatch(/Move \$\{blockLabel\} down/);
    expect(content).toMatch(/Delete block/);
    expect(content).toMatch(/data-selected/);
    expect(content).not.toMatch(/selectedBadge/);
    expect(content).not.toMatch(/>Selected</);
    expect(content).not.toMatch(/Default sets for/);
    expect(content).not.toMatch(/Default rest for/);
    expect(content).not.toMatch(/headerFieldLabel}>Sets</);
    expect(content).not.toMatch(/restFieldGroup/);
    expect(content).not.toMatch(/blockNotePreview/);
    expect(content).not.toMatch(/Focus:/);
    expect(css).toMatch(/\.blockHeaderSurface/);
    expect(css).toMatch(/\.blockHeaderActions/);
    expect(css).toMatch(/\.blockMoveControls/);
    expect(css).toMatch(/\.blockMenuControl/);
  });
});
