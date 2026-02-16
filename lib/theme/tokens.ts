/**
 * Purpose: Central, typed design tokens for colors, spacing, radii, and typography.
 * Usage: Import tokens or the resolved theme via ThemeProvider/useTheme.
 * Side-effects: None.
 */

export type ColorScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

export interface Palette {
  gray: ColorScale;
  brand: ColorScale;
  red: ColorScale;
  green: ColorScale;
  yellow: ColorScale;
  blue: ColorScale;
}

export const palette: Palette = {
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  brand: {
    50: "#ECFEF5",
    100: "#D1FADF",
    200: "#A6F4C5",
    300: "#6CE9B6",
    400: "#32D39A",
    500: "#12B981",
    600: "#0EA371",
    700: "#0A845D",
    800: "#07694C",
    900: "#034237",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  green: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },
  yellow: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },
};

export interface SpacingScale {
  xxs: number; // 4
  xs: number;  // 8
  sm: number;  // 12
  md: number;  // 16
  lg: number;  // 24
  xl: number;  // 32
  "2xl": number; // 40
  "3xl": number; // 48
}

export const spacing: SpacingScale = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 48,
};

export interface RadiusScale {
  sm: number;   // 8
  md: number;   // 12
  lg: number;   // 16
  xl: number;   // 24
  full: number; // 999 for pills/circles
}

export const radii: RadiusScale = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export interface TypographyTokens {
  fontFamily: {
    regular: string; // platform defaults; can be customized later
    medium: string;
    bold: string;
  };
  size: {
    xs: number;  // 12
    sm: number;  // 14
    md: number;  // 16
    lg: number;  // 20
    xl: number;  // 24
    "2xl": number; // 32
  };
  lineHeight: {
    tight: number;   // 1.1
    snug: number;    // 1.25
    normal: number;  // 1.4
    relaxed: number; // 1.6
  };
  weight: {
    regular: "400";
    medium: "500";
    bold: "700";
  };
}

export const typography: TypographyTokens = {
  fontFamily: {
    regular: "System",
    medium: "System",
    bold: "System",
  },
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, "2xl": 32 },
  lineHeight: { tight: 1.1, snug: 1.25, normal: 1.4, relaxed: 1.6 },
  weight: { regular: "400", medium: "500", bold: "700" },
};

export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  overlay: string;

  primary: string;
  onPrimary: string;

  secondary: string;
  onSecondary: string;

  success: string;
  onSuccess: string;

  warning: string;
  onWarning: string;

  danger: string;
  onDanger: string;
}

export interface Theme {
  scheme: "light" | "dark";
  colors: ThemeColors;
  spacing: SpacingScale;
  radii: RadiusScale;
  typography: TypographyTokens;
}

export const lightTheme: Theme = {
  scheme: "light",
  colors: {
    bg: "#FFFFFF",
    card: "#FFFFFF",
    text: palette.gray[900],
    textMuted: palette.gray[600],
    border: palette.gray[200],
    overlay: "rgba(0,0,0,0.08)",

    primary: palette.brand[600],
    onPrimary: "#FFFFFF",

    secondary: palette.gray[800],
    onSecondary: "#FFFFFF",

    success: palette.green[600],
    onSuccess: "#FFFFFF",

    warning: palette.yellow[600],
    onWarning: "#111827",

    danger: palette.red[600],
    onDanger: "#FFFFFF",
  },
  spacing,
  radii,
  typography,
};

export const darkTheme: Theme = {
  scheme: "dark",
  colors: {
    bg: palette.gray[900],
    card: palette.gray[800],
    text: palette.gray[50],
    textMuted: palette.gray[400],
    border: palette.gray[700],
    overlay: "rgba(255,255,255,0.08)",

    primary: palette.brand[400],
    onPrimary: "#06291F",

    secondary: palette.gray[300],
    onSecondary: "#111827",

    success: palette.green[400],
    onSuccess: "#06291F",

    warning: palette.yellow[400],
    onWarning: "#111827",

    danger: palette.red[400],
    onDanger: "#111827",
  },
  spacing,
  radii,
  typography,
};

export type { Theme as OliTheme };
