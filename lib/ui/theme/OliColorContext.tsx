import React, { createContext, useContext, useMemo } from "react";

import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import {
  OLI_DARK,
  OLI_LIGHT,
  type OliSemanticColors,
} from "@/lib/ui/theme/oliSemantic";

type OliColorTheme = {
  mode: OliThemeMode;
  colors: OliSemanticColors;
};

const DEFAULT_COLOR_THEME: OliColorTheme = {
  mode: "dark",
  colors: OLI_DARK,
};

const OliColorContext = createContext<OliColorTheme>(DEFAULT_COLOR_THEME);

export function OliColorProvider({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: OliThemeMode;
}) {
  const value = useMemo<OliColorTheme>(
    () => ({
      mode,
      colors: mode === "light" ? OLI_LIGHT : OLI_DARK,
    }),
    [mode],
  );
  return <OliColorContext.Provider value={value}>{children}</OliColorContext.Provider>;
}

/**
 * Lightweight semantic color hook. It intentionally does not import React
 * Navigation, so leaf presentation components remain safe in isolated tests.
 */
export function useOliColorTheme(): OliColorTheme {
  return useContext(OliColorContext);
}

export function useOliColors(): OliSemanticColors {
  return useOliColorTheme().colors;
}
