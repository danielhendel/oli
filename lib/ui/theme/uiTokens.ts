/**
 * Cross-module UI tokens. **Active values follow the default dark theme** (see {@link OLI_DARK}).
 * Preserved light palette: {@link OLI_LIGHT} from `./oliSemantic`.
 */
import { OLI_DARK, OLI_LIGHT, type OliSemanticColors } from "@/lib/ui/theme/oliSemantic";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export { OLI_LIGHT, OLI_DARK, type OliSemanticColors };

const T = OLI_DARK;

export const UI_TEXT_PRIMARY = T.textPrimary;
export const UI_TEXT_SECONDARY = T.textSecondary;
export const UI_TEXT_MUTED = T.textTertiary;
export const UI_TEXT_TERTIARY_LABEL = T.textTertiary;

/** Cool blue-gray secondary line on grouped sheets (e.g. Dash section tagline). */
export const UI_TEXT_SLATE_COOL = T.textSlateCool;

/** Header back / toolbar pill fill. */
export const UI_HEADER_CHROME_BG = T.headerChromeBg;

/** Hairline border for header chrome (capsule, back circle). */
export const UI_HEADER_CHROME_BORDER = T.headerChromeBorder;

/** Horizontal inset inside grouped header capsule (calendar + overflow). */
export const UI_HEADER_CAPSULE_PADDING_H = 9;

/**
 * Flex `gap` between capsule segments (calendar | divider | overflow).
 * With a ~1px divider, total air between segment centers reads ~14–16px.
 */
export const UI_HEADER_CAPSULE_SEGMENT_GAP = 7;

/** Vertical rule between capsule actions — lighter than outer chrome border. */
export const UI_HEADER_CAPSULE_DIVIDER = T.headerCapsuleDivider;

/** Secondary inline actions (e.g. in-card “View More”) — neutral, not accent CTA. */
export const UI_LINK_SECONDARY = T.linkSecondary;

export const UI_BORDER_HAIRLINE = T.borderHairline;
export const UI_SCREEN_BG = T.screenBgGrouped;

/**
 * Manage menu panel, modal stacks, and elevated metric cards — identical to semantic `surfaceElevated`
 * (single source of truth; do not diverge from {@link UI_CARD_SURFACE}).
 */
export const UI_PANEL_SURFACE = T.surfaceElevated;
export const UI_SURFACE_ELEVATED = UI_PANEL_SURFACE;
export const UI_CARD_SURFACE = UI_PANEL_SURFACE;

/** 1px edge on elevated cards — subtle hairline. */
export const UI_CARD_ELEVATED_BORDER = T.cardElevatedBorder;

/** App-wide grouped page root (tab roots, ScreenContainer default). */
export const UI_APP_SCREEN_BG = T.appScreenBg;

/** @deprecated Use UI_APP_SCREEN_BG — kept for existing imports. */
export const UI_DASH_SCREEN_BG = UI_APP_SCREEN_BG;

/**
 * Horizontal inset for tab root scroll areas and the outer edge of grouped content (card shells).
 */
export const UI_TAB_ROOT_INSET = 20;

/**
 * Inner gutter from `UI_TAB_ROOT_INSET` so tab header titles and primary row / card text share one vertical alignment.
 */
export const UI_TAB_ROOT_CONTENT_GUTTER = 18;

/** Apply inside tab-root scroll bodies (after horizontal `UI_TAB_ROOT_INSET`) for primary text alignment. */
export const UI_TAB_ROOT_CONTENT_GUTTER_STYLE = {
  paddingHorizontal: UI_TAB_ROOT_CONTENT_GUTTER,
} as const;

/** Default corner radius for cards on grouped backgrounds (non-Dash). */
export const UI_GROUPED_CARD_RADIUS = 16;

/** Daily Recap on Dash — crisp primary card (tighter than secondary nav rows). */
export const UI_DASH_RECAP_CARD_RADIUS = 14;

/** Dash category module rows — softer, more premium than recap. */
export const UI_DASH_CATEGORY_CARD_RADIUS = 20;

/** Modal scrim / overlay dim */
export const UI_OVERLAY = T.overlay;

export const UI_SURFACE_PRESSED = T.surfacePressed;

export const UI_NAV_SURFACE = T.navSurface;
export const UI_NAV_SURFACE_BORDER = T.navSurfaceBorder;
export const UI_NAV_SURFACE_ACTIVE = T.navSurfaceActive;
export const UI_NAV_ICON_ACTIVE = T.navIconActive;
export const UI_NAV_ICON_INACTIVE = T.navIconInactive;

/** Calendar / workout day ring stroke (`WorkoutDayRing` uses {@link SYSTEM_ACCENT}). */
export const UI_CALENDAR_RING_STROKE = SYSTEM_ACCENT;

/** Floating bottom nav — active tab icon + label (same blue as calendar rings). */
export const UI_NAV_TAB_ICON_ACTIVE = SYSTEM_ACCENT;

/** Floating bottom nav — inactive tab icon + label (white on dark nav pill). */
export const UI_NAV_TAB_ICON_INACTIVE = "#FFFFFF";

/** Dash "My goal" action pills share the floating nav glass material. */
export const UI_GOAL_PILL_SURFACE = UI_NAV_SURFACE;

export const UI_PROGRESS_TRACK_EMPTY = T.progressTrackEmpty;

export const UI_BORDER_SUBTLE = T.borderSubtle;
export const UI_BORDER_STRONG = T.borderStrong;
