import fs from "node:fs";
import path from "node:path";

describe("Program Builder hub", () => {
  it("is a compatibility redirect away from placeholder builders", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "builder.tsx"), "utf8");
    expect(src).toContain("Redirect");
    expect(src).toContain("OLI_TAB_ROUTES.program");
    expect(src).not.toContain("ProgramBuilderHubScreen");
    expect(src).not.toContain("Cardio Builder");
  });
});
