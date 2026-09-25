const LBS_PER_KG = 2.2046226218;

/** One decimal place; drop a trailing `.0` so whole values read as `161 lb` not `161.0 lb`. */
function formatBodyWeightValue(v: number): string {
  const oneDecimal = v.toFixed(1);
  return oneDecimal.endsWith(".0") ? oneDecimal.slice(0, -2) : oneDecimal;
}

/** Shared weight label for Body Composition Today, Dash body card, and related surfaces. */
export function formatBodyWeight(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return `${formatBodyWeightValue(v)} ${unit}`;
}

/**
 * Signed Weight/Lean Mass change for trend summary — descriptive, not judgmental.
 * Uses Unicode minus (U+2212) for losses so the sign reads clearly.
 */
export function formatBodyWeightChange(deltaKg: number, unit: "kg" | "lb"): string {
  if (!Number.isFinite(deltaKg)) return "—";
  const magnitude = formatBodyWeight(Math.abs(deltaKg), unit);
  if (deltaKg > 0) return `+${magnitude}`;
  if (deltaKg < 0) return `−${magnitude}`;
  return magnitude;
}

export function formatBodyBmi(bmi: number): string {
  return bmi.toFixed(1);
}

export function formatBodyLeanMass(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return `${v.toFixed(1)} ${unit}`;
}

export function formatBodyRmr(kcal: number): string {
  return `${Math.round(kcal)} kcal/day`;
}

export function neutralMetricProgress(hasValue: boolean): number {
  return hasValue ? 0.5 : 0;
}
