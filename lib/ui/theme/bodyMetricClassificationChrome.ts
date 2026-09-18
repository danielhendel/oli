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
  readonly label: string;
  readonly range: string;
  readonly divider: string;
};

/** Luminous spectrum fills for dark elevated Body cards (non-shaming). */
const DARK: Record<BodyMetricClassificationTone, BodyMetricClassificationBandChrome> = {
  cool: {
    fill: "rgba(96, 165, 250, 0.72)",
    fillStrong: "#3B82F6",
    fillHighlight: "rgba(191, 219, 254, 0.55)",
    label: "#F3F7FF",
    range: "#9DB4D4",
    divider: "rgba(11,13,16,0.45)",
  },
  reference: {
    fill: "rgba(52, 211, 153, 0.70)",
    fillStrong: "#10B981",
    fillHighlight: "rgba(167, 243, 208, 0.50)",
    label: "#F0FFF8",
    range: "#8FBFAB",
    divider: "rgba(11,13,16,0.45)",
  },
  caution: {
    fill: "rgba(251, 191, 36, 0.68)",
    fillStrong: "#F59E0B",
    fillHighlight: "rgba(253, 230, 138, 0.48)",
    label: "#FFF9EC",
    range: "#C4AE7A",
    divider: "rgba(11,13,16,0.45)",
  },
  elevated: {
    fill: "rgba(248, 113, 113, 0.66)",
    fillStrong: "#EF4444",
    fillHighlight: "rgba(254, 202, 202, 0.45)",
    label: "#FFF5F5",
    range: "#C49A9A",
    divider: "rgba(11,13,16,0.45)",
  },
  neutral: {
    fill: "rgba(148, 163, 184, 0.40)",
    fillStrong: "#64748B",
    fillHighlight: "rgba(226, 232, 240, 0.28)",
    label: "#F7F8FA",
    range: "#A7AFBC",
    divider: "rgba(11,13,16,0.35)",
  },
};

export function resolveBodyMetricClassificationBandChrome(
  tone: BodyMetricClassificationTone,
): BodyMetricClassificationBandChrome {
  return DARK[tone] ?? DARK.neutral;
}

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
