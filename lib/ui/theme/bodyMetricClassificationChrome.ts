/**
 * Semantic band tones for Body metric classification charts (Stage 3B).
 * Color is secondary to written labels and numeric ranges — never the only signal.
 *
 * Proposal-matched treatment: classification names use bright segment hues (not
 * generic near-white), with slightly softer coordinated ranges underneath.
 */

export type BodyMetricClassificationTone =
  | "cool"
  | "reference"
  | "caution"
  | "elevated"
  | "neutral";

export type BodyMetricClassificationBandChrome = {
  readonly fill: string;
  readonly fillStrong: string;
  readonly fillHighlight: string;
  /** Bright segment-colored classification name (OLED-legible). */
  readonly label: string;
  /** Coordinated numeric range under the name — slightly softer than label. */
  readonly range: string;
  readonly divider: string;
};

/**
 * Luminous spectrum fills + proposal-matched segment-colored under-bar labels.
 * Labels use bright semantic hues matching each band — not tertiary/disabled opacity,
 * and not generic white for all four classes.
 */
const DARK: Record<BodyMetricClassificationTone, BodyMetricClassificationBandChrome> = {
  cool: {
    fill: "rgba(96, 165, 250, 0.72)",
    fillStrong: "#3B82F6",
    fillHighlight: "rgba(191, 219, 254, 0.55)",
    label: "#7DD3FC",
    range: "#93C5FD",
    divider: "rgba(11,13,16,0.45)",
  },
  reference: {
    fill: "rgba(52, 211, 153, 0.70)",
    fillStrong: "#10B981",
    fillHighlight: "rgba(167, 243, 208, 0.50)",
    label: "#4ADE80",
    range: "#6EE7B7",
    divider: "rgba(11,13,16,0.45)",
  },
  caution: {
    fill: "rgba(251, 191, 36, 0.68)",
    fillStrong: "#F59E0B",
    fillHighlight: "rgba(253, 230, 138, 0.48)",
    label: "#FBBF24",
    range: "#FCD34D",
    divider: "rgba(11,13,16,0.45)",
  },
  elevated: {
    fill: "rgba(248, 113, 113, 0.66)",
    fillStrong: "#EF4444",
    fillHighlight: "rgba(254, 202, 202, 0.45)",
    label: "#FB7185",
    range: "#FDA4AF",
    divider: "rgba(11,13,16,0.45)",
  },
  neutral: {
    fill: "rgba(148, 163, 184, 0.40)",
    fillStrong: "#64748B",
    fillHighlight: "rgba(226, 232, 240, 0.28)",
    label: "#CBD5E1",
    range: "#94A3B8",
    divider: "rgba(11,13,16,0.35)",
  },
};

export function resolveBodyMetricClassificationBandChrome(
  tone: BodyMetricClassificationTone,
): BodyMetricClassificationBandChrome {
  return DARK[tone] ?? DARK.neutral;
}

/**
 * Exported for style-contract tests — classification names must stay segment-colored
 * (not generic near-white / muted tertiary).
 */
export const BODY_METRIC_CLASSIFICATION_LABEL_TOKENS = {
  cool: DARK.cool.label,
  reference: DARK.reference.label,
  caution: DARK.caution.label,
  elevated: DARK.elevated.label,
} as const;

export const BODY_METRIC_CLASSIFICATION_RANGE_TOKENS = {
  cool: DARK.cool.range,
  reference: DARK.reference.range,
  caution: DARK.caution.range,
  elevated: DARK.elevated.range,
} as const;

/** Marker capsule / pointer on dark elevated cards. */
export const BODY_METRIC_CHART_MARKER_FILL = "#FFFFFF";
export const BODY_METRIC_CHART_MARKER_TEXT = "#0B0D10";
export const BODY_METRIC_CHART_MARKER_BORDER = "rgba(255,255,255,0.92)";
export const BODY_METRIC_CHART_MARKER_GLOW = "rgba(255,255,255,0.28)";
export const BODY_METRIC_CHART_TRACK_BORDER = "rgba(255,255,255,0.14)";
export const BODY_METRIC_CHART_TRACK_SHEEN = "rgba(255,255,255,0.22)";
export const BODY_METRIC_CHART_TRACK_SHADOW = "rgba(0,0,0,0.45)";

/** Soft unclassified continuum (visual family only — not a standard). @deprecated Prefer neutral rail. */
export const BODY_METRIC_UNCLASSIFIED_SPECTRUM = [
  { fill: "#3B82F6", highlight: "rgba(191, 219, 254, 0.40)" },
  { fill: "#10B981", highlight: "rgba(167, 243, 208, 0.35)" },
  { fill: "#F59E0B", highlight: "rgba(253, 230, 138, 0.32)" },
  { fill: "#EF4444", highlight: "rgba(254, 202, 202, 0.30)" },
] as const;

/** Honest single-tone rail for unclassified Body metrics (no implied classes). */
export const BODY_METRIC_UNCLASSIFIED_NEUTRAL_FILL = "rgba(148, 163, 184, 0.42)";
export const BODY_METRIC_UNCLASSIFIED_NEUTRAL_HIGHLIGHT = "rgba(226, 232, 240, 0.28)";

/** Shared spectrum track geometry for classified + unclassified charts. */
export const BODY_METRIC_SPECTRUM_HEIGHT = 12;
export const BODY_METRIC_SPECTRUM_RADIUS = 999;
