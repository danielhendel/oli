/**
 * Deterministic Weight trend Y-axis ticks.
 * Imperial: clean 10 lb steps. Metric: clean 5 kg steps.
 * Observation-driven — no zero-floor, no healthy-band padding.
 * Adds one intentional upper headroom tick above the rounded ceiling.
 */

export type WeightAxisUnit = "lb" | "kg";

export type WeightAxisTick = {
  /** Value in display units (e.g. 160 for lb). */
  readonly valueDisplay: number;
  /** Same tick expressed in kilograms for chart geometry. */
  readonly valueKg: number;
  /** Axis label text (no unit suffix). */
  readonly label: string;
};

export type WeightAxisTicksModel = {
  readonly status: "ready" | "unavailable";
  /** Chart domain min in kg. */
  readonly domainMinKg: number;
  /** Chart domain max in kg. */
  readonly domainMaxKg: number;
  readonly ticks: readonly WeightAxisTick[];
  /** Step in display units (10 for lb, 5 for kg, or a multiple thereof). */
  readonly step: number;
  readonly unit: WeightAxisUnit;
};

export type BuildWeightAxisTicksInput = {
  /** Observed min in kilograms (raw observation). */
  readonly minKg: number;
  /** Observed max in kilograms (raw observation). */
  readonly maxKg: number;
  readonly unit: WeightAxisUnit;
};

const LBS_PER_KG = 2.2046226218;
const STEP_LB = 10;
/** Clean metric step with intentional headroom (mirrors 10 lb imperial). */
const STEP_KG = 5;
/** Prefer 3–5 tick levels (2–4 intervals). */
const MAX_INTERVALS = 4;
const MIN_INTERVALS = 2;

function kgToDisplay(kg: number, unit: WeightAxisUnit): number {
  return unit === "lb" ? kg * LBS_PER_KG : kg;
}

function displayToKg(display: number, unit: WeightAxisUnit): number {
  return unit === "lb" ? display / LBS_PER_KG : display;
}

function baseStep(unit: WeightAxisUnit): number {
  return unit === "lb" ? STEP_LB : STEP_KG;
}

/**
 * Expand step in multiples of the unit base so tick count stays readable
 * on wide ranges without inventing ugly decimals.
 */
function resolveStep(spanDisplay: number, unit: WeightAxisUnit): number {
  const base = baseStep(unit);
  let step = base;
  while (spanDisplay / step > MAX_INTERVALS) {
    step += base;
  }
  return step;
}

function buildTicks(
  domainMinDisplay: number,
  domainMaxDisplay: number,
  step: number,
  unit: WeightAxisUnit,
): WeightAxisTick[] {
  const ticks: WeightAxisTick[] = [];
  // Guard against floating drift on stepped addition.
  const n = Math.round((domainMaxDisplay - domainMinDisplay) / step);
  for (let i = 0; i <= n; i++) {
    const valueDisplay = domainMinDisplay + i * step;
    ticks.push({
      valueDisplay,
      valueKg: displayToKg(valueDisplay, unit),
      label: Number.isInteger(valueDisplay)
        ? String(valueDisplay)
        : valueDisplay.toFixed(1),
    });
  }
  return ticks;
}

/**
 * Build clean Weight axis ticks from observed min/max (kg).
 * Pure / deterministic / unit-aware. No UI or Firebase imports.
 */
export function buildWeightAxisTicks(
  input: BuildWeightAxisTicksInput,
): WeightAxisTicksModel {
  const { minKg, maxKg, unit } = input;
  if (
    !Number.isFinite(minKg) ||
    !Number.isFinite(maxKg) ||
    minKg <= 0 ||
    maxKg <= 0
  ) {
    return {
      status: "unavailable",
      domainMinKg: 0,
      domainMaxKg: 1,
      ticks: [],
      step: baseStep(unit),
      unit,
    };
  }

  const loKg = Math.min(minKg, maxKg);
  const hiKg = Math.max(minKg, maxKg);
  const loDisplay = kgToDisplay(loKg, unit);
  const hiDisplay = kgToDisplay(hiKg, unit);
  const base = baseStep(unit);

  let axisMin = Math.floor(loDisplay / base) * base;
  let axisMax = Math.ceil(hiDisplay / base) * base;

  // Exact boundary → one step of breathing room so the line does not kiss the edge.
  if (loDisplay <= axisMin + 1e-9) {
    axisMin -= base;
  }
  if (hiDisplay >= axisMax - 1e-9) {
    axisMax += base;
  }

  // Intentional upper headroom tick above the highest rounded ceiling.
  // Example: 156–166.5 lb → 150 / 160 / 170 / 180.
  axisMax += base;

  // At least two intervals so a single/narrow cluster does not exaggerate change.
  let span = axisMax - axisMin;
  const minSpan = base * MIN_INTERVALS;
  if (span < minSpan) {
    const mid = (axisMin + axisMax) / 2;
    axisMin = mid - minSpan / 2;
    axisMax = mid + minSpan / 2;
    // Re-snap to clean base multiples after expansion.
    axisMin = Math.floor(axisMin / base) * base;
    axisMax = Math.ceil(axisMax / base) * base;
    span = axisMax - axisMin;
    if (span < minSpan) {
      axisMax = axisMin + minSpan;
    }
  }

  // Never invent a zero floor for adult Weight display.
  if (axisMin < 0) {
    axisMax -= axisMin;
    axisMin = 0;
  }

  const step = resolveStep(axisMax - axisMin, unit);
  // Re-align domain to the resolved step so ticks stay integer multiples.
  axisMin = Math.floor(axisMin / step) * step;
  axisMax = Math.ceil(axisMax / step) * step;
  if (axisMax - axisMin < step * MIN_INTERVALS) {
    axisMax = axisMin + step * MIN_INTERVALS;
  }

  const ticks = buildTicks(axisMin, axisMax, step, unit);
  return {
    status: "ready",
    domainMinKg: displayToKg(axisMin, unit),
    domainMaxKg: displayToKg(axisMax, unit),
    ticks,
    step,
    unit,
  };
}
