/**
 * Unified system accent (neutral blue). Structural chrome — distinct from semantic health greens.
 *
 * Do **not** use for: destructive/error (system red), success-only semantics, RPE heatmaps,
 * Body Composition interpretation quality bands, or rest-timer running/warning states.
 */
export const SYSTEM_ACCENT = "#3A5BDB";

/** RGB components for `SYSTEM_ACCENT` (#3A5BDB → 58, 91, 219). */
const R = 58;
const G = 91;
const B = 219;

/** Inner disk wash (~14% opacity) — Body / Nutrition ring fills. */
export const SYSTEM_ACCENT_FILL_14 = `rgba(${R}, ${G}, ${B}, 0.14)`;

/** Lighter wash (~11% opacity) — training week ring fill. */
export const SYSTEM_ACCENT_FILL_11 = `rgba(${R}, ${G}, ${B}, 0.11)`;

/** Mixed-day inner wash / soft banners (~10% opacity). */
export const SYSTEM_ACCENT_OVERLAY_10 = `rgba(${R}, ${G}, ${B}, 0.1)`;

/** Metric tiles under charts (~18% opacity). */
export const SYSTEM_ACCENT_TILE_WASH = `rgba(${R}, ${G}, ${B}, 0.18)`;

/**
 * Mixed strength+cardio day marker — deeper blue (ring stroke stays {@link SYSTEM_ACCENT}).
 */
export const SYSTEM_ACCENT_MIXED_MARK = "#2D4BB3";

/** Selected row / subtle highlight on white (e.g. gym picker, overflow menus). */
export const SYSTEM_ACCENT_OVERLAY_08 = `rgba(${R}, ${G}, ${B}, 0.08)`;

/**
 * Second numeric series (e.g. volume vs load) — cool neutral slate (not accent blue, not success green).
 */
export const SYSTEM_METRIC_SECONDARY = "#64748B";
