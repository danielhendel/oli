import fs from "node:fs";
import path from "node:path";

describe("WorkoutBlocksPanel design", () => {
  const panelPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutBlocksPanel.tsx",
  );
  const canvasCssPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutAuthorCanvas.module.css",
  );

  it("renders block builder without Build your workout heading", () => {
    const content = fs.readFileSync(panelPath, "utf8");
    expect(content).toMatch(/studio-blocks-panel/);
    expect(content).toMatch(/WorkoutBlockCard/);
    expect(content).not.toMatch(/Build your workout/);
    expect(content).not.toMatch(/panelEyebrow/);
    expect(content).not.toMatch(
      /Add exercises from the library, then edit sets, reps, RPE, rest, and tempo directly/,
    );
  });

  it("keeps Add block area with bottom scroll breathing room", () => {
    const content = fs.readFileSync(panelPath, "utf8");
    const css = fs.readFileSync(canvasCssPath, "utf8");
    expect(content).toMatch(/AddBlockInline/);
    expect(content).toMatch(/blocksStack/);
    expect(css).toMatch(/\.blocksStack[\s\S]*padding-bottom:\s*clamp\(48px, 6vh, 96px\)/);
  });
});
