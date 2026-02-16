import { lightTheme, darkTheme } from "../../lib/theme/tokens";

describe("theme tokens", () => {
  test("schemes are labeled correctly", () => {
    expect(lightTheme.scheme).toBe("light");
    expect(darkTheme.scheme).toBe("dark");
  });

  test("text contrasts against background", () => {
    expect(lightTheme.colors.text).not.toBe(lightTheme.colors.bg);
    expect(darkTheme.colors.text).not.toBe(darkTheme.colors.bg);
  });

  test("primary/onPrimary are complementary (sanity)", () => {
    expect(lightTheme.colors.primary).not.toBe(lightTheme.colors.onPrimary);
    expect(darkTheme.colors.primary).not.toBe(darkTheme.colors.onPrimary);
  });
});
