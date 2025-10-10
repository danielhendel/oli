// apps/mobile/theme/index.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { colors, typography } from './tokens';

type Theme = {
  scheme: ColorSchemeName;
  colors: typeof colors['light'];
  typography: typeof typography;
  accent: string;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<Theme>(() => {
    const pal = scheme === 'dark' ? colors.dark : colors.light;
    return { scheme, colors: pal, typography, accent: colors.accent };
  }, [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
