/**
 * Semantic color roles for Oli light/dark themes. Structural accents remain in {@link systemAccent}.
 */

export type OliSemanticColors = {
  /** App root / scroll backdrop */
  background: string;
  backgroundRaised: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;
  overlay: string;
  borderSubtle: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  navSurface: string;
  navSurfaceBorder: string;
  navSurfaceActive: string;
  navIconActive: string;
  navIconInactive: string;

  cardSurface: string;
  cardSurfaceElevated: string;
  cardBorder: string;

  /** Cool slate taglines (Dash section explainer) */
  textSlateCool: string;

  /** Grouped module inner fill (legacy UI_SCREEN_BG) */
  screenBgGrouped: string;

  /** Tab / app chrome root (legacy UI_APP_SCREEN_BG) */
  appScreenBg: string;

  /** Header capsule / chrome family */
  headerChromeBg: string;
  headerChromeBorder: string;
  headerCapsuleDivider: string;

  /** Hairlines and elevated card edges */
  borderHairline: string;
  cardElevatedBorder: string;

  /** Secondary inline links */
  linkSecondary: string;

  /** Progress / segmented controls — empty track */
  progressTrackEmpty: string;

  /** Subtle shadow on elevated surfaces (iOS) */
  shadowColor: string;
};

/** Manage menu sheet + elevated module cards — one literal; keep `surfaceElevated` and `cardSurface` aligned. */
const OLI_DARK_PANEL_SURFACE = "#181D23";

/** Production dark palette (default). */
export const OLI_DARK: OliSemanticColors = {
  background: "#0B0D10",
  backgroundRaised: "#101419",
  surface: "#12161B",
  surfaceElevated: OLI_DARK_PANEL_SURFACE,
  surfacePressed: "#20262E",
  overlay: "rgba(0,0,0,0.58)",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",

  textPrimary: "#F7F8FA",
  textSecondary: "#A7AFBC",
  textTertiary: "#6F7785",
  textInverse: "#0B0D10",

  navSurface: "rgba(48,56,66,0.7)",
  navSurfaceBorder: "rgba(255,255,255,0.14)",
  navSurfaceActive: "rgba(255,255,255,0.10)",
  navIconActive: "#F7F8FA",
  navIconInactive: "#8B93A1",

  /** Primary card fill — matches Manage menu panel (`surfaceElevated`). */
  cardSurface: OLI_DARK_PANEL_SURFACE,
  cardSurfaceElevated: OLI_DARK_PANEL_SURFACE,
  cardBorder: "rgba(255,255,255,0.08)",

  textSlateCool: "#9AACBF",
  screenBgGrouped: "#0B0D10",
  appScreenBg: "#0B0D10",

  headerChromeBg: "#101419",
  headerChromeBorder: "rgba(255,255,255,0.10)",
  headerCapsuleDivider: "rgba(255,255,255,0.08)",

  borderHairline: "rgba(255,255,255,0.08)",
  cardElevatedBorder: "rgba(255,255,255,0.08)",

  linkSecondary: "#A7AFBC",

  progressTrackEmpty: "rgba(255,255,255,0.12)",

  shadowColor: "#000000",
};

/** Legacy light palette — preserved for dual-theme support and tests. */
export const OLI_LIGHT: OliSemanticColors = {
  background: "#F2F2F7",
  backgroundRaised: "#F2F2F7",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfacePressed: "#E5E5EA",
  overlay: "rgba(0,0,0,0.45)",
  borderSubtle: "rgba(60,60,67,0.18)",
  borderStrong: "rgba(60,60,67,0.29)",

  textPrimary: "#1C1C1E",
  textSecondary: "#3C3C43",
  textTertiary: "#6E6E73",
  textInverse: "#FFFFFF",

  navSurface: "rgba(255,255,255,0.92)",
  navSurfaceBorder: "rgba(60,60,67,0.14)",
  navSurfaceActive: "rgba(0,0,0,0.06)",
  navIconActive: "#1C1C1E",
  navIconInactive: "#8E8E93",

  cardSurface: "#FFFFFF",
  cardSurfaceElevated: "#FFFFFF",
  cardBorder: "rgba(60,60,67,0.08)",

  textSlateCool: "#5B6C8A",
  screenBgGrouped: "#F2F2F7",
  appScreenBg: "#EEF3F8",

  headerChromeBg: "#F2F2F7",
  headerChromeBorder: "rgba(60,60,67,0.12)",
  headerCapsuleDivider: "rgba(60,60,67,0.08)",

  borderHairline: "#E5E5EA",
  cardElevatedBorder: "rgba(60,60,67,0.08)",

  linkSecondary: "#3C3C43",

  progressTrackEmpty: "rgba(60,60,67,0.12)",

  shadowColor: "#000000",
};
