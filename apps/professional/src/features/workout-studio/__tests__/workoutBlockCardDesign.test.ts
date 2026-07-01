import fs from "node:fs";
import path from "node:path";

describe("WorkoutBlockCard design", () => {
  const blockCardPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutBlockCard.tsx",
  );

  it("uses compact controls and separate block type row", () => {
    const content = fs.readFileSync(blockCardPath, "utf8");
    expect(content).toMatch(/typeSelect/);
    expect(content).toMatch(/iconButton/);
    expect(content).toMatch(/data-selected/);
    expect(content).toMatch(/selectedBadge/);
    expect(content).not.toMatch(/Block Notes/);
    expect(content).not.toMatch(/>Duplicate</);
    expect(content).not.toMatch(/>Remove</);
  });
});
