// lib/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme, View, Pressable, Text as RNText } from "react-native";
import { StatusBar } from "expo-status-bar";
import { darkTheme, lightTheme, type OliTheme } from "./tokens";

export type ColorSchemeSetting = "light" | "dark" | "system";

export function cycleThemeSetting(s: ColorSchemeSetting): ColorSchemeSetting {
  return s === "system" ? "light" : s === "light" ? "dark" : "system";
}

interface ThemeContextValue {
  theme: OliTheme;
  colorSchemeSetting: ColorSchemeSetting;
  setColorSchemeSetting: (
    next: ColorSchemeSetting | ((prev: ColorSchemeSetting) => ColorSchemeSetting)
  ) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ProviderProps = { children: React.ReactNode; showToggle?: boolean };

// Wrap any stray string/number nodes in <RNText> so <View>{children}</View> never errors
function wrapTextNodes(node: React.ReactNode): React.ReactNode {
  return React.Children.map(node, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <RNText>{child}</RNText>;
    }
    // Also handle arrays that might have nested text nodes
    if (Array.isArray(child)) return wrapTextNodes(child);
    return child as React.ReactNode;
  });
}

export function ThemeProvider({ children, showToggle = false }: ProviderProps) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [setting, setSetting] = useState<ColorSchemeSetting>("system");

  const effectiveScheme: "light" | "dark" =
    setting === "system" ? (system ?? "light") : setting;

  const theme = useMemo(
    () => (effectiveScheme === "dark" ? darkTheme : lightTheme),
    [effectiveScheme]
  );
  const isDark = effectiveScheme === "dark";

  const value: ThemeContextValue = useMemo(
    () => ({ theme, colorSchemeSetting: setting, setColorSchemeSetting: setSetting, isDark }),
    [theme, setting, isDark]
  );

  const envToggle = process.env.EXPO_PUBLIC_THEME_TOGGLE === "1";
  const showDevToggle = showToggle || envToggle;

  const devBadgeBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const label = setting === "system" ? "SYS" : setting === "light" ? "L" : "D";

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {wrapTextNodes(children)}

        {showDevToggle && (
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", bottom: 18, right: 14, zIndex: 1000 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle color scheme"
              onPress={() => setSetting((prev) => cycleThemeSetting(prev))}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: devBadgeBg,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <RNText style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text }}>
                {label}
              </RNText>
            </Pressable>
          </View>
        )}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used within <ThemeProvider />");
  return ctx;
}

export function useThemeController() {
  const { colorSchemeSetting, setColorSchemeSetting, isDark } = useTheme();
  return {
    setting: colorSchemeSetting,
    set: setColorSchemeSetting,
    cycle: () => setColorSchemeSetting((prev) => cycleThemeSetting(prev)),
    isDark,
  };
}
