/**
 * Height-specific Weight range labels for CDC/WHO adult BMI screening.
 *
 * Display strategy (documented): integer threshold ticks in the user's mass unit.
 * - Compute exact weight at BMI 18.5 / 25 / 30 for height.
 * - Round each boundary to nearest integer in display unit.
 * - Enforce strictly increasing ticks so adjacent bands share no gap or overlap.
 * - Underweight: `<T18.5`
 * - Healthy Weight: `T18.5–(T25−1)`
 * - Overweight: `T25–(T30−1)`
 * - Obesity: `≥T30`
 */

import type { MassDisplayUnit } from "@/lib/body/bodyCompositionShared";
import { weightKgForBmiAtHeight } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";

const LB_PER_KG = 2.2046226218;

export type CdcWhoHeightWeightDisplayTicks = {
  readonly atBmi185: number;
  readonly atBmi25: number;
  readonly atBmi30: number;
  readonly unit: MassDisplayUnit;
};

function toDisplayMass(kg: number, unit: MassDisplayUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

function roundTick(value: number): number {
  return Math.round(value);
}

/**
 * Build gap-free integer ticks for height-specific BMI screening weight ranges.
 * Returns null when height is invalid.
 */
export function buildCdcWhoHeightWeightDisplayTicks(
  heightCm: number,
  unit: MassDisplayUnit,
): CdcWhoHeightWeightDisplayTicks | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const kg185 = weightKgForBmiAtHeight(18.5, heightCm);
  const kg25 = weightKgForBmiAtHeight(25, heightCm);
  const kg30 = weightKgForBmiAtHeight(30, heightCm);
  if (kg185 == null || kg25 == null || kg30 == null) return null;

  const atBmi185 = roundTick(toDisplayMass(kg185, unit));
  let atBmi25 = roundTick(toDisplayMass(kg25, unit));
  let atBmi30 = roundTick(toDisplayMass(kg30, unit));

  // Enforce strictly increasing ticks (no gaps/overlaps after rounding).
  if (atBmi25 <= atBmi185) atBmi25 = atBmi185 + 1;
  if (atBmi30 <= atBmi25) atBmi30 = atBmi25 + 1;

  return { atBmi185, atBmi25, atBmi30, unit };
}

export function formatCdcWhoWeightRangeForClass(
  classId: "underweight" | "healthy_weight" | "overweight" | "obesity",
  ticks: CdcWhoHeightWeightDisplayTicks | null,
): string | null {
  if (ticks == null) return null;
  const u = ticks.unit;
  switch (classId) {
    case "underweight":
      return `<${ticks.atBmi185} ${u}`;
    case "healthy_weight":
      return `${ticks.atBmi185}–${ticks.atBmi25 - 1} ${u}`;
    case "overweight":
      return `${ticks.atBmi25}–${ticks.atBmi30 - 1} ${u}`;
    case "obesity":
      return `≥${ticks.atBmi30} ${u}`;
    default:
      return null;
  }
}

/** Assert adjacent displayed ranges abut without gap or overlap. */
export function assertCdcWhoHeightWeightRangesContiguous(
  ticks: CdcWhoHeightWeightDisplayTicks,
): boolean {
  const healthyHi = ticks.atBmi25 - 1;
  const overweightHi = ticks.atBmi30 - 1;
  return (
    ticks.atBmi185 > 0 &&
    healthyHi >= ticks.atBmi185 &&
    ticks.atBmi25 === healthyHi + 1 &&
    overweightHi >= ticks.atBmi25 &&
    ticks.atBmi30 === overweightHi + 1
  );
}
