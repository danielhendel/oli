/**
 * Deterministic Body Fat trend Y-axis ticks (percentage points).
 * Nice steps: 1 / 2 / 5 (and multiples). Observation-driven — no classification padding.
 */

export type BodyFatAxisTick = {
  /** Tick value in percentage points (e.g. 18). */
  readonly valuePercent: number;
  /** Axis label text (no `%` suffix — chart shows bare numbers like Weight). */
  readonly label: string;
};

export type BodyFatAxisTicksModel = {
  readonly status: "ready" | "unavailable";
  readonly domainMinPercent: number;
  readonly domainMaxPercent: number;
  readonly ticks: readonly BodyFatAxisTick[];
  /** Step in percentage points. */
  readonly step: number;
};

export type BuildBodyFatAxisTicksInput = {
  readonly minPercent: number;
  readonly maxPercent: number;
};

/** Prefer 3–5 tick levels (2–4 intervals). */
const MAX_INTERVALS = 4;
const MIN_INTERVALS = 2;
const NICE_STEPS = [1, 2, 5, 10, 20] as const;

function resolveStep(span: number): number {
  for (const step of NICE_STEPS) {
    if (span / step <= MAX_INTERVALS) return step;
  }
  // Extreme span — grow by 5s.
  let step = 25;
  while (span / step > MAX_INTERVALS) {
    step += 5;
  }
  return step;
}

function buildTicks(
  domainMin: number,
  domainMax: number,
  step: number,
): BodyFatAxisTick[] {
  const ticks: BodyFatAxisTick[] = [];
  const n = Math.round((domainMax - domainMin) / step);
  for (let i = 0; i <= n; i++) {
    const valuePercent = domainMin + i * step;
    ticks.push({
      valuePercent,
      label: Number.isInteger(valuePercent)
        ? String(valuePercent)
        : valuePercent.toFixed(1),
    });
  }
  return ticks;
}

/**
 * Build clean Body Fat axis ticks from observed min/max (%).
 * Pure / deterministic. No UI or Firebase imports.
 */
export function buildBodyFatAxisTicks(
  input: BuildBodyFatAxisTicksInput,
): BodyFatAxisTicksModel {
  const { minPercent, maxPercent } = input;
  if (
    !Number.isFinite(minPercent) ||
    !Number.isFinite(maxPercent) ||
    minPercent < 0 ||
    maxPercent < 0
  ) {
    return {
      status: "unavailable",
      domainMinPercent: 0,
      domainMaxPercent: 1,
      ticks: [],
      step: 1,
    };
  }

  const lo = Math.min(minPercent, maxPercent);
  const hi = Math.max(minPercent, maxPercent);
  const base = 1;

  let axisMin = Math.floor(lo / base) * base;
  let axisMax = Math.ceil(hi / base) * base;

  // Exact boundary → one point of breathing room.
  if (lo <= axisMin + 1e-9) {
    axisMin -= base;
  }
  if (hi >= axisMax - 1e-9) {
    axisMax += base;
  }

  // Intentional upper headroom tick.
  axisMax += base;

  let span = axisMax - axisMin;
  const minSpan = base * MIN_INTERVALS;
  if (span < minSpan) {
    const mid = (axisMin + axisMax) / 2;
    axisMin = mid - minSpan / 2;
    axisMax = mid + minSpan / 2;
    axisMin = Math.floor(axisMin / base) * base;
    axisMax = Math.ceil(axisMax / base) * base;
    span = axisMax - axisMin;
    if (span < minSpan) {
      axisMax = axisMin + minSpan;
    }
  }

  if (axisMin < 0) {
    axisMax -= axisMin;
    axisMin = 0;
  }

  const step = resolveStep(axisMax - axisMin);
  axisMin = Math.floor(axisMin / step) * step;
  axisMax = Math.ceil(axisMax / step) * step;
  if (axisMax - axisMin < step * MIN_INTERVALS) {
    axisMax = axisMin + step * MIN_INTERVALS;
  }

  return {
    status: "ready",
    domainMinPercent: axisMin,
    domainMaxPercent: axisMax,
    ticks: buildTicks(axisMin, axisMax, step),
    step,
  };
}
