const LBS_PER_KG = 2.2046226218;

export function formatBodyWeight(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return `${v.toFixed(1)} ${unit}`;
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
