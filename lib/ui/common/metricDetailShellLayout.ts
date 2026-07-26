/**
 * Layout constants and height helpers for {@link MetricDetailShell}.
 * Pure — no React. Keeps near-full-screen sheet math out of JSX.
 */

/** Intentional backdrop gap above the rounded sheet top (below status / top Safe Area). */
export const METRIC_DETAIL_TOP_BACKDROP_GAP = 10;

/** Minimum Done control height (points). */
export const METRIC_DETAIL_FOOTER_MIN_HEIGHT = 48;

/** Extra spacing below the last scroll body line above the fixed footer. */
export const METRIC_DETAIL_BODY_END_SPACING = 16;

/** Top corner radius for the near-full-screen sheet. */
export const METRIC_DETAIL_TOP_CORNER_RADIUS = 18;

/** Horizontal sheet inset. */
export const METRIC_DETAIL_HORIZONTAL_PADDING = 20;

/** Large vertical break between major sections (e.g. range → pattern, pattern → education). */
export const METRIC_DETAIL_SECTION_BREAK = 28;

/** Gap between a section heading and its first row/paragraph. */
export const METRIC_DETAIL_SECTION_HEADING_GAP = 10;

/** Default stack gap inside the scroll body for tight hero/status grouping. */
export const METRIC_DETAIL_STACK_GAP = 12;

/**
 * Near-full-screen sheet height:
 * windowHeight − topSafeArea − topBackdropGap
 *
 * Bottom flush with the window; bottom Safe Area is applied inside the footer.
 */
export function metricDetailSheetHeight(input: {
  windowHeight: number;
  topSafeArea: number;
  topBackdropGap?: number;
}): number {
  const gap = input.topBackdropGap ?? METRIC_DETAIL_TOP_BACKDROP_GAP;
  const top = Math.max(0, input.topSafeArea) + Math.max(0, gap);
  const h = input.windowHeight - top;
  return Number.isFinite(h) ? Math.max(0, h) : 0;
}

/**
 * Bottom content inset for the scroll body so the last line clears the fixed footer.
 */
export function metricDetailBodyBottomInset(input: {
  footerHeight: number;
  bottomSafeArea: number;
  endSpacing?: number;
}): number {
  const footer = Math.max(METRIC_DETAIL_FOOTER_MIN_HEIGHT, input.footerHeight);
  const safe = Math.max(0, input.bottomSafeArea);
  const end = input.endSpacing ?? METRIC_DETAIL_BODY_END_SPACING;
  return footer + safe + end;
}
