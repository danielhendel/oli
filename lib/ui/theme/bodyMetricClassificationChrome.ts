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
  readonly label: string;
  readonly range: string;
  readonly divider: string;
};

const DARK: Record<BodyMetricClassificationTone, BodyMetricClassificationBandChrome> = {
  cool: {
    fill: "rgba(125, 168, 212, 0.28)",
    label: "#D7E4F2",
    range: "#A7AFBC",
    divider: "rgba(255,255,255,0.10)",
  },
  reference: {
    fill: "rgba(58, 91, 219, 0.42)",
    label: "#F7F8FA",
    range: "#C8D0DC",
    divider: "rgba(255,255,255,0.12)",
  },
  caution: {
    fill: "rgba(212, 168, 92, 0.34)",
    label: "#F3E6CF",
    range: "#B8A88C",
    divider: "rgba(255,255,255,0.10)",
  },
  elevated: {
    fill: "rgba(196, 120, 110, 0.38)",
    label: "#F5D8D4",
    range: "#C4A09A",
    divider: "rgba(255,255,255,0.10)",
  },
  neutral: {
    fill: "rgba(255,255,255,0.10)",
    label: "#F7F8FA",
    range: "#A7AFBC",
    divider: "rgba(255,255,255,0.08)",
  },
};

export function resolveBodyMetricClassificationBandChrome(
  tone: BodyMetricClassificationTone,
): BodyMetricClassificationBandChrome {
  return DARK[tone] ?? DARK.neutral;
}

/** Marker capsule / pointer on dark elevated cards. */
export const BODY_METRIC_CHART_MARKER_FILL = "#F7F8FA";
export const BODY_METRIC_CHART_MARKER_TEXT = "#0B0D10";
export const BODY_METRIC_CHART_TRACK_BORDER = "rgba(255,255,255,0.10)";
