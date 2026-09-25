/**
 * Place a displayed numeric value onto equal-width classification segments.
 * Presentation positioning only — not an approved personal classification claim.
 */

import type {
  BodyMetricClassificationChartMarker,
  BodyMetricClassificationChartSegment,
} from "@/lib/body/presentation/bodyMetricCardTypes";

export type BodyChartMarkerKind = "classification" | "value_position";

/**
 * Resolve which segment contains `value` and a 0–1 within-segment position.
 * Open-ended bands use the adjacent mid-band width as a visual span.
 */
export function resolveChartValueSegmentPlacement(input: {
  readonly value: number;
  readonly segments: readonly BodyMetricClassificationChartSegment[];
}): { readonly segmentId: string; readonly withinSegmentPosition: number } | null {
  if (!Number.isFinite(input.value) || input.segments.length === 0) return null;

  const { segments, value } = input;
  let midWidth = 10;
  for (const s of segments) {
    if (s.lowerBound != null && s.upperBound != null && s.upperBound > s.lowerBound) {
      midWidth = s.upperBound - s.lowerBound;
      break;
    }
  }

  for (const segment of segments) {
    const aboveLower =
      segment.lowerBound == null ||
      (segment.lowerInclusive ? value >= segment.lowerBound : value > segment.lowerBound);
    const belowUpper =
      segment.upperBound == null ||
      (segment.upperInclusive ? value <= segment.upperBound : value < segment.upperBound);
    if (!(aboveLower && belowUpper)) continue;

    let within: number;
    if (segment.lowerBound != null && segment.upperBound != null) {
      const span = segment.upperBound - segment.lowerBound;
      within = span > 0 ? (value - segment.lowerBound) / span : 0.5;
    } else if (segment.upperBound != null && segment.lowerBound == null) {
      // Lower / open below: approach 1.0 near the upper edge.
      const floor = segment.upperBound - midWidth;
      within = midWidth > 0 ? (value - floor) / midWidth : 0.5;
    } else if (segment.lowerBound != null && segment.upperBound == null) {
      // Higher / open above: approach 0.0 near the lower edge.
      within = midWidth > 0 ? (value - segment.lowerBound) / midWidth : 0.5;
    } else {
      within = 0.5;
    }

    return {
      segmentId: segment.id,
      withinSegmentPosition: Math.max(0.08, Math.min(0.92, within)),
    };
  }
  return null;
}

export function buildClassificationChartMarker(input: {
  readonly kind: BodyChartMarkerKind;
  readonly value: number;
  readonly segments: readonly BodyMetricClassificationChartSegment[];
  readonly formattedValue: string;
  readonly accessibleLabel: string;
}): BodyMetricClassificationChartMarker | null {
  const placement = resolveChartValueSegmentPlacement({
    value: input.value,
    segments: input.segments,
  });
  if (placement == null) return null;
  return {
    kind: input.kind,
    formattedValue: input.formattedValue,
    showValueLabel: false,
    segmentId: placement.segmentId,
    withinSegmentPosition: placement.withinSegmentPosition,
    accessibleLabel: input.accessibleLabel,
  };
}
