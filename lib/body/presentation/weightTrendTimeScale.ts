/**
 * Shared Weight trend time → screen X mapping.
 * One scale for series points, month labels, touch hit-testing, and the active guide.
 */

export type WeightTrendTimeScale = {
  readonly domainStartMs: number;
  readonly domainEndMs: number;
  readonly plotLeft: number;
  readonly plotWidth: number;
};

/**
 * Linear timestamp scale — NOT ordinal/index spacing.
 * Identical formula for every horizontal element on the Weight chart.
 */
export function mapWeightTrendTimeToX(
  timeMs: number,
  scale: WeightTrendTimeScale,
): number {
  const span = scale.domainEndMs - scale.domainStartMs || 1;
  return scale.plotLeft + ((timeMs - scale.domainStartMs) / span) * scale.plotWidth;
}

/** Inverse of {@link mapWeightTrendTimeToX} for touch → timestamp hit-testing. */
export function mapWeightTrendXToTime(
  screenX: number,
  scale: WeightTrendTimeScale,
): number {
  const span = scale.domainEndMs - scale.domainStartMs || 1;
  const plotWidth = scale.plotWidth || 1;
  return scale.domainStartMs + ((screenX - scale.plotLeft) / plotWidth) * span;
}
