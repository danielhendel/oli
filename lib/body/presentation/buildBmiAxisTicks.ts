/**
 * Deterministic BMI trend Y-axis — clean BMI-unit ticks, balanced headroom.
 * Mirrors Body Fat axis policy with BMI-appropriate steps (1 or 2).
 */

export type BmiAxisTick = {
  readonly valueBmi: number;
  readonly label: string;
};

export type BmiAxisTicksModel = {
  readonly status: "ready" | "unavailable";
  readonly domainMinBmi: number;
  readonly domainMaxBmi: number;
  readonly ticks: readonly BmiAxisTick[];
  readonly step: number;
};

const MIN_INTERVALS = 3;
const MAX_INTERVALS = 5;

function resolveStep(span: number): number {
  if (span / 1 <= MAX_INTERVALS) return 1;
  if (span / 2 <= MAX_INTERVALS) return 2;
  if (span / 5 <= MAX_INTERVALS) return 5;
  let step = 10;
  while (span / step > MAX_INTERVALS) {
    step += 5;
  }
  return step;
}

function isValidBmi(v: number): boolean {
  return Number.isFinite(v) && v > 0 && v < 100;
}

/**
 * Build nice BMI axis ticks from observed min/max BMI.
 */
export function buildBmiAxisTicks(args: {
  readonly minBmi: number;
  readonly maxBmi: number;
}): BmiAxisTicksModel {
  const { minBmi, maxBmi } = args;
  if (!isValidBmi(minBmi) || !isValidBmi(maxBmi) || maxBmi < minBmi) {
    return {
      status: "unavailable",
      domainMinBmi: 0,
      domainMaxBmi: 0,
      ticks: [],
      step: 0,
    };
  }

  const span = Math.max(maxBmi - minBmi, 1e-6);
  const step = resolveStep(span);
  let domainMin = Math.floor(minBmi / step) * step;
  let domainMax = Math.ceil(maxBmi / step) * step;
  if (domainMax <= domainMin) domainMax = domainMin + step * MIN_INTERVALS;

  let intervals = Math.round((domainMax - domainMin) / step);
  while (intervals < MIN_INTERVALS) {
    const headroomLow = minBmi - domainMin;
    const headroomHigh = domainMax - maxBmi;
    if (headroomLow <= headroomHigh) {
      domainMin -= step;
    } else {
      domainMax += step;
    }
    intervals = Math.round((domainMax - domainMin) / step);
  }

  const ticks: BmiAxisTick[] = [];
  const n = Math.round((domainMax - domainMin) / step);
  for (let i = 0; i <= n; i++) {
    const valueBmi = domainMin + i * step;
    ticks.push({
      valueBmi,
      label: Number.isInteger(valueBmi) ? String(valueBmi) : valueBmi.toFixed(1),
    });
  }

  return {
    status: "ready",
    domainMinBmi: domainMin,
    domainMaxBmi: domainMax,
    ticks,
    step,
  };
}

/** Shared BMI domain across timeframes from full available BMI series. */
export function buildBmiDetailSharedDomain(args: {
  readonly valuesBmi: readonly number[];
}): BmiAxisTicksModel | null {
  const valid = args.valuesBmi.filter(isValidBmi);
  if (valid.length === 0) return null;
  return buildBmiAxisTicks({
    minBmi: Math.min(...valid),
    maxBmi: Math.max(...valid),
  });
}
