import type { Theme } from "@react-navigation/native";
import { DarkTheme } from "@react-navigation/native";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import type { OliSemanticColors } from "@/lib/ui/theme/oliSemantic";
import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";

export type OliThemeMode = "light" | "dark";

export type OliTheme = {
  mode: OliThemeMode;
  colors: OliSemanticColors;
  navigationTheme: Theme;
};

function buildNavigationTheme(colors: OliSemanticColors): Theme {
  return {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: SYSTEM_ACCENT,
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.borderSubtle,
      notification: SYSTEM_ACCENT,
    },
  };
}

/** Resolved semantic colors + React Navigation theme for a mode. */
export function getOliTheme(mode: OliThemeMode): OliTheme {
  const colors = mode === "light" ? OLI_LIGHT : OLI_DARK;
  return {
    mode,
    colors,
    navigationTheme: buildNavigationTheme(colors),
  };
}

/** Default product direction: dark. */
export const OLI_DEFAULT_THEME_MODE: OliThemeMode = "dark";

export const OLI_DEFAULT_THEME = getOliTheme(OLI_DEFAULT_THEME_MODE);

/** Tab navigator theme — matches app shell background/card. Exported for tests. */
export function createOliTabNavigationTheme(): Theme {
  return getOliTheme(OLI_DEFAULT_THEME_MODE).navigationTheme;
}
