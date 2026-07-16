import React, { createContext, useContext, useMemo } from "react";
import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import {
  OLI_DEFAULT_THEME_MODE,
  getOliTheme,
  type OliTheme,
} from "@/lib/ui/theme/oliTheme";
import type { OliSemanticColors } from "@/lib/ui/theme/oliSemantic";
import { OliColorProvider } from "@/lib/ui/theme/OliColorContext";

const OliThemeContext = createContext<OliTheme | null>(null);

export type OliThemeProviderProps = {
  children: React.ReactNode;
  /** Defaults to dark per product direction. */
  mode?: OliThemeMode;
};

export function OliThemeProvider({ children, mode = OLI_DEFAULT_THEME_MODE }: OliThemeProviderProps) {
  const value = useMemo(() => getOliTheme(mode), [mode]);
  return (
    <OliColorProvider mode={mode}>
      <OliThemeContext.Provider value={value}>{children}</OliThemeContext.Provider>
    </OliColorProvider>
  );
}

export function useOliTheme(): OliTheme {
  const ctx = useContext(OliThemeContext);
  if (ctx == null) {
    return getOliTheme(OLI_DEFAULT_THEME_MODE);
  }
  return ctx;
}

export function useOliColors(): OliSemanticColors {
  return useOliTheme().colors;
}
