/**
 * Shared floating-dock layout metrics (pill + home-indicator offset).
 * Kept out of `FloatingNavigationChrome` so scroll-padding helpers can import
 * numbers without pulling the nav tree.
 */
export const FLOATING_NAV_DOCK_H_INSET = 18;
export const FLOATING_NAV_DOCK_BOTTOM_MARGIN = 4;
export const FLOATING_NAV_PILL_MIN_HEIGHT = 56;
/** @deprecated No detached FAB in the four-destination dock. Kept for test compatibility. */
export const FLOATING_NAV_PILL_FAB_GAP = 10;
