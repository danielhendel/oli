/**
 * Semantic band tones for Body metric classification charts (Stage 3B).
 * Color is secondary to written labels and numeric ranges — never the only signal.
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
  /** High-contrast classification name on dark cards (OLED-legible). */
  readonly label: string;
  /** High-contrast numeric range under the name. */
  readonly range: string;
  readonly divider: string;
};

/**
 * Luminous spectrum fills + bright under-bar label tokens for dark elevated Body cards.
 * Labels intentionally use near-white / bright semantic tones — not tertiary/disabled opacity.
 */
const DARK: Record<BodyMetricClassificationTone, BodyMetricClassificationBandChrome> = {
  cool: {
    fill: "rgba(96, 165, 250, 0.72)",
    fillStrong: "#3B82F6",
    fillHighlight: "rgba(191, 219, 254, 0.55)",
    label: "#E8F2FF",
    range: "#D7E6FA",
    divider: "rgba(11,13,16,0.45)",
  },
  reference: {
    fill: "rgba(52, 211, 153, 0.70)",
    fillStrong: "#10B981",
    fillHighlight: "rgba(167, 243, 208, 0.50)",
    label: "#E9FFF5",
    range: "#D4F5E6",
    divider: "rgba(11,13,16,0.45)",
  },
  caution: {
    fill: "rgba(251, 191, 36, 0.68)",
    fillStrong: "#F59E0B",
    fillHighlight: "rgba(253, 230, 138, 0.48)",
    label: "#FFF6DF",
    range: "#F5E6C0",
    divider: "rgba(11,13,16,0.45)",
  },
  elevated: {
    fill: "rgba(248, 113, 113, 0.66)",
    fillStrong: "#EF4444",
    fillHighlight: "rgba(254, 202, 202, 0.45)",
    label: "#FFECEC",
    range: "#F8D4D4",
    divider: "rgba(11,13,16,0.45)",
  },
  neutral: {
    fill: "rgba(148, 163, 184, 0.40)",
    fillStrong: "#64748B",
    fillHighlight: "rgba(226, 232, 240, 0.28)",
    label: "#F7F8FA",
    range: "#E2E8F0",
    divider: "rgba(11,13,16,0.35)",
  },
};

export function resolveBodyMetricClassificationBandChrome(
  tone: BodyMetricClassificationTone,
): BodyMetricClassificationBandChrome {
  return DARK[tone] ?? DARK.neutral;
}

/** Exported for style-contract tests — classification names must stay high-contrast. */
export const BODY_METRIC_CLASSIFICATION_LABEL_MIN_LUMINANCE_HEX = "#E8F2FF";

/** Marker capsule / pointer on dark elevated cards. */
export const BODY_METRIC_CHART_MARKER_FILL = "#FFFFFF";
export const BODY_METRIC_CHART_MARKER_TEXT = "#0B0D10";
export const BODY_METRIC_CHART_MARKER_BORDER = "rgba(255,255,255,0.92)";
export const BODY_METRIC_CHART_MARKER_GLOW = "rgba(255,255,255,0.28)";
export const BODY_METRIC_CHART_TRACK_BORDER = "rgba(255,255,255,0.14)";
export const BODY_METRIC_CHART_TRACK_SHEEN = "rgba(255,255,255,0.22)";
export const BODY_METRIC_CHART_TRACK_SHADOW = "rgba(0,0,0,0.45)";

/** Soft unclassified continuum (visual family only — not a standard). */
export const BODY_METRIC_UNCLASSIFIED_SPECTRUM = [
  { fill: "#3B82F6", highlight: "rgba(191, 219, 254, 0.40)" },
  { fill: "#10B981", highlight: "rgba(167, 243, 208, 0.35)" },
  { fill: "#F59E0B", highlight: "rgba(253, 230, 138, 0.32)" },
  { fill: "#EF4444", highlight: "rgba(254, 202, 202, 0.30)" },
] as const;

/** Shared spectrum track geometry for classified + unclassified charts. */
export const BODY_METRIC_SPECTRUM_HEIGHT = 12;
export const BODY_METRIC_SPECTRUM_RADIUS = 999;
