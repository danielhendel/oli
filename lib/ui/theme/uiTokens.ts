/**
 * Shared neutral / chrome tokens for cross-module UI consistency.
 * Accent colors stay in {@link systemAccent} and domain themes.
 */
export const UI_TEXT_PRIMARY = "#1C1C1E";
export const UI_TEXT_SECONDARY = "#3C3C43";
export const UI_TEXT_MUTED = "#6E6E73";
export const UI_TEXT_TERTIARY_LABEL = "#8E8E93";

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
