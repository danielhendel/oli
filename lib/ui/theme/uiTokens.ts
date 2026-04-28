/**
 * Shared neutral / chrome tokens for cross-module UI consistency.
 * Accent colors stay in {@link systemAccent} and domain themes.
 */
export const UI_TEXT_PRIMARY = "#1C1C1E";
export const UI_TEXT_SECONDARY = "#3C3C43";
export const UI_TEXT_MUTED = "#6E6E73";
export const UI_TEXT_TERTIARY_LABEL = "#8E8E93";

/** Cool blue-gray secondary line on grouped sheets (e.g. Dash section tagline) — calm, not marketing blue. */
export const UI_TEXT_SLATE_COOL = "#5B6C8A";

/** Header back / toolbar pill fill (iOS grouped background family). */
export const UI_HEADER_CHROME_BG = "#F2F2F7";

/** Hairline border for header chrome (capsule, back circle) — subtle separation from white nav bar. */
export const UI_HEADER_CHROME_BORDER = "rgba(60, 60, 67, 0.12)";

/** Horizontal inset inside grouped header capsule (calendar + overflow). */
export const UI_HEADER_CAPSULE_PADDING_H = 9;

/**
 * Flex `gap` between capsule segments (calendar | divider | overflow).
 * With a ~1px divider, total air between segment centers reads ~14–16px.
 */
export const UI_HEADER_CAPSULE_SEGMENT_GAP = 7;

/** Vertical rule between capsule actions — lighter than outer chrome border. */
export const UI_HEADER_CAPSULE_DIVIDER = "rgba(60, 60, 67, 0.08)";

/** Secondary inline actions (e.g. in-card “View More”) — neutral, not accent CTA. */
export const UI_LINK_SECONDARY = UI_TEXT_SECONDARY;

export const UI_BORDER_HAIRLINE = "#E5E5EA";
export const UI_SCREEN_BG = "#F2F2F7";
export const UI_CARD_SURFACE = "#FFFFFF";

/** 1px edge on elevated white cards over grouped backgrounds — barely visible, iOS-style hairline. */
export const UI_CARD_ELEVATED_BORDER = "rgba(60, 60, 67, 0.08)";

/** App-wide grouped page root (tab roots, ScreenContainer default). Calm blue-gray. */
export const UI_APP_SCREEN_BG = "#EEF3F8";

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

/** Default corner radius for white cards on grouped backgrounds (non-Dash). */
export const UI_GROUPED_CARD_RADIUS = 16;

/** Daily Recap on Dash — crisp primary card (tighter than secondary nav rows). */
export const UI_DASH_RECAP_CARD_RADIUS = 14;

/** Dash category module rows — softer, more premium than recap. */
export const UI_DASH_CATEGORY_CARD_RADIUS = 20;
