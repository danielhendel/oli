/// <reference types="jest" />

import { getButtonStyles } from "../../lib/ui/Button";
import { lightTheme, darkTheme } from "../../lib/theme/tokens";

describe("getButtonStyles", () => {
  test("primary variant uses primary/onPrimary colors", () => {
    const s = getButtonStyles(lightTheme, "primary", false);
    expect(s.backgroundColor).toBe(lightTheme.colors.primary);
    expect(s.textColor).toBe(lightTheme.colors.onPrimary);
  });

  test("secondary variant uses secondary/onSecondary colors", () => {
    const s = getButtonStyles(lightTheme, "secondary", false);
    expect(s.backgroundColor).toBe(lightTheme.colors.secondary);
    expect(s.textColor).toBe(lightTheme.colors.onSecondary);
  });

  test("ghost variant is transparent with border and theme text", () => {
    const s = getButtonStyles(lightTheme, "ghost", false);
    expect(s.backgroundColor).toBe("transparent");
    expect(s.borderWidth).toBe(1);
    expect(s.borderColor).toBe(lightTheme.colors.border);
    expect(s.textColor).toBe(lightTheme.colors.text);
  });

  test("disabled primary dims background via border color", () => {
    const s = getButtonStyles(lightTheme, "primary", true);
    expect(s.backgroundColor).toBe(lightTheme.colors.border);
  });

  test("dark theme primary picks dark palette entries", () => {
    const s = getButtonStyles(darkTheme, "primary", false);
    expect(s.backgroundColor).toBe(darkTheme.colors.primary);
    expect(s.textColor).toBe(darkTheme.colors.onPrimary);
  });
});
