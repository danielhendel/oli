import { cycleThemeSetting, type ColorSchemeSetting } from "../../lib/theme/ThemeProvider";

describe("cycleThemeSetting", () => {
  const cases: ReadonlyArray<readonly [ColorSchemeSetting, ColorSchemeSetting]> = [
    ["system", "light"],
    ["light", "dark"],
    ["dark", "system"],
  ] as const;

  test("cycles system -> light -> dark -> system", () => {
    for (const [input, expected] of cases) {
      expect(cycleThemeSetting(input)).toBe(expected);
    }
  });
});
