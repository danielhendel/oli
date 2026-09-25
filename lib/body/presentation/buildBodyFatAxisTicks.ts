/**
 * Deterministic Body Fat trend Y-axis — balanced headroom, clean %-point ticks.
 *
 * Policy:
 * 1. Prefer 2%-point steps for normal narrow adult ranges (5% for broader).
 * 2. Round observed min down / max up to the nearest tick.
 * 3. Ensure ≥3 intervals (4 major ticks).
 * 4. Extra intervals go to the side with less existing headroom.
 *
 * Pure / deterministic. No UI or Firebase imports.
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

/** Alias matching the Stage 3C axis contract naming. */
export type BodyFatAxisModel = {
  readonly domainMin: number;
  readonly domainMax: number;
  readonly ticks: readonly number[];
  readonly step: number;
};

export type BuildBodyFatAxisTicksInput = {
  readonly minPercent: number;
  readonly maxPercent: number;
};

/** Prefer ≥3 intervals → 4 visible major ticks. */
const MIN_INTERVALS = 3;
const MAX_INTERVALS = 5;

function resolveStep(span: number): number {
  // Prefer 2pt for typical narrow adult Body Fat history.
  if (span / 2 <= MAX_INTERVALS) return 2;
  if (span / 5 <= MAX_INTERVALS) return 5;
  if (span / 10 <= MAX_INTERVALS) return 10;
  let step = 20;
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

function isValidPercent(v: number): boolean {
  return Number.isFinite(v) && v > 0 && v <= 100;
}

/**
 * Build clean Body Fat axis ticks from observed min/max (%).
 */
export function buildBodyFatAxisTicks(
  input: BuildBodyFatAxisTicksInput,
): BodyFatAxisTicksModel {
  const { minPercent, maxPercent } = input;
  if (!isValidPercent(minPercent) || !isValidPercent(maxPercent)) {
    return {
      status: "unavailable",
      domainMinPercent: 0,
      domainMaxPercent: 1,
      ticks: [],
      step: 2,
    };
  }

  const lo = Math.min(minPercent, maxPercent);
  const hi = Math.max(minPercent, maxPercent);
  const span = hi - lo;
  const step = resolveStep(Math.max(span, stepFloorSpan(span)));

  let axisMin = Math.floor(lo / step) * step;
  let axisMax = Math.ceil(hi / step) * step;

  let lowerHeadroom = lo - axisMin;
  let upperHeadroom = axisMax - hi;
  let intervals = Math.round((axisMax - axisMin) / step);

  while (intervals < MIN_INTERVALS) {
    if (lowerHeadroom <= upperHeadroom) {
      axisMin -= step;
      lowerHeadroom += step;
    } else {
      axisMax += step;
      upperHeadroom += step;
    }
    intervals = Math.round((axisMax - axisMin) / step);
  }

  if (axisMin < 0) {
    const shift = -axisMin;
    axisMin = 0;
    axisMax += shift;
  }
  if (axisMax > 100) {
    const overflow = axisMax - 100;
    axisMax = 100;
    axisMin = Math.max(0, axisMin - overflow);
    axisMin = Math.floor(axisMin / step) * step;
  }

  return {
    status: "ready",
    domainMinPercent: axisMin,
    domainMaxPercent: axisMax,
    ticks: buildTicks(axisMin, axisMax, step),
    step,
  };
}

/** Tiny positive span still prefers the 2pt step path. */
function stepFloorSpan(span: number): number {
  return span < 1e-9 ? 2 : span;
}

/**
 * Contract helper: build axis model from a value list (filters invalid %).
 */
export function buildBodyFatAxisModel(input: {
  readonly values: readonly number[];
}): BodyFatAxisModel | null {
  const values = input.values.filter(isValidPercent);
  if (values.length === 0) return null;
  const axis = buildBodyFatAxisTicks({
    minPercent: Math.min(...values),
    maxPercent: Math.max(...values),
  });
  if (axis.status !== "ready") return null;
  return {
    domainMin: axis.domainMinPercent,
    domainMax: axis.domainMaxPercent,
    ticks: axis.ticks.map((t) => t.valuePercent),
    step: axis.step,
  };
}
