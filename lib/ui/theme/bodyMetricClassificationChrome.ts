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
  readonly label: string;
  readonly range: string;
  readonly divider: string;
};

/** Vivid, non-shaming spectrum fills for dark elevated Body cards. */
const DARK: Record<BodyMetricClassificationTone, BodyMetricClassificationBandChrome> = {
  cool: {
    fill: "rgba(96, 165, 250, 0.55)",
    fillStrong: "rgba(59, 130, 246, 0.78)",
    label: "#E8F1FF",
    range: "#AFC4E0",
    divider: "rgba(11,13,16,0.35)",
  },
  reference: {
    fill: "rgba(52, 211, 153, 0.52)",
    fillStrong: "rgba(16, 185, 129, 0.72)",
    label: "#E8FFF5",
    range: "#A7D9C4",
    divider: "rgba(11,13,16,0.35)",
  },
  caution: {
    fill: "rgba(251, 191, 36, 0.48)",
    fillStrong: "rgba(245, 158, 11, 0.68)",
    label: "#FFF6E0",
    range: "#D9C49A",
    divider: "rgba(11,13,16,0.35)",
  },
  elevated: {
    fill: "rgba(248, 113, 113, 0.48)",
    fillStrong: "rgba(239, 68, 68, 0.62)",
    label: "#FFE8E8",
    range: "#D9A8A8",
    divider: "rgba(11,13,16,0.35)",
  },
  neutral: {
    fill: "rgba(148, 163, 184, 0.28)",
    fillStrong: "rgba(148, 163, 184, 0.42)",
    label: "#F7F8FA",
    range: "#A7AFBC",
    divider: "rgba(11,13,16,0.28)",
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
export const BODY_METRIC_CHART_MARKER_GLOW = "rgba(255,255,255,0.22)";
export const BODY_METRIC_CHART_TRACK_BORDER = "rgba(255,255,255,0.12)";
export const BODY_METRIC_CHART_TRACK_INNER = "rgba(0,0,0,0.22)";

/** Soft unclassified continuum (visual family only — not a standard). */
export const BODY_METRIC_UNCLASSIFIED_SPECTRUM = [
  "rgba(96, 165, 250, 0.35)",
  "rgba(52, 211, 153, 0.32)",
  "rgba(251, 191, 36, 0.30)",
  "rgba(248, 113, 113, 0.28)",
] as const;
