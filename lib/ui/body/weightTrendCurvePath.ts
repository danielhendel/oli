/**
 * Weight detail trend path geometry — presentation-only curve mode.
 * Core and halo must share one path from this builder (no dual generators).
 */
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";

export type WeightTrendCurveMode = "linear" | "monotone";

/**
 * Approved Weight detail curve: straight segments between observations.
 * No cubic overshoot and no exaggerated waves between measurements.
 */
export const WEIGHT_TREND_CURVE_MODE: WeightTrendCurveMode = "linear";

export type WeightTrendCurvePoint = {
  readonly x: number;
  readonly y: number;
};

/** Straight polyline through observation screen coordinates. */
export function linearPathD(points: readonly WeightTrendCurvePoint[]): string {
  if (points.length < 2) return "";
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i]!.x} ${points[i]!.y}`;
  }
  return path;
}

/**
 * Build the single Weight trend SVG `d` for the approved curve mode.
 * Halo and core strokes must both consume this string.
 */
export function buildWeightTrendCurvePath(
  points: readonly WeightTrendCurvePoint[],
  mode: WeightTrendCurveMode = WEIGHT_TREND_CURVE_MODE,
): string {
  if (mode === "monotone") return monotonePathD(points);
  return linearPathD(points);
}
