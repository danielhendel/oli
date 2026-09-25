/**
 * Weight detail trend stroke presentation — crisp bright-blue core + restrained
 * blue elevation halo + thin light-blue active guide. Presentation-only.
 */
import { SYSTEM_ACCENT_LUMINOUS } from "@/lib/ui/theme/systemAccent";

export type WeightTrendStrokeVisual = {
  readonly coreColor: string;
  readonly coreWidth: number;
  /** Same hue as core; low-opacity support stroke (not a blur filter). */
  readonly haloColor: string;
  readonly haloWidth: number;
  /** Light blue, thinner than the trend core; distinct from gray vertical grid. */
  readonly activeGuideColor: string;
  readonly activeGuideWidth: number;
};

/** Luminous RGB (#5B8CFF → 91, 140, 255). */
const LR = 91;
const LG = 140;
const LB = 255;

/** Soft light-blue guide family (#A8C4FF → 168, 196, 255). */
const SR = 168;
const SG = 196;
const SB = 255;

/**
 * Canonical Weight detail stroke contract.
 * One crisp opaque core + one low-opacity halo — no stacked glow layers.
 */
export const WEIGHT_TREND_STROKE_VISUAL = {
  coreColor: SYSTEM_ACCENT_LUMINOUS,
  coreWidth: 2.25,
  /** ~20% opacity — subtle float without fuzz. */
  haloColor: `rgba(${LR}, ${LG}, ${LB}, 0.20)`,
  haloWidth: 4.75,
  /** ~82% opacity light blue — elegant, not heavy. */
  activeGuideColor: `rgba(${SR}, ${SG}, ${SB}, 0.82)`,
  activeGuideWidth: 1.25,
} as const satisfies WeightTrendStrokeVisual;
