const LBS_PER_KG = 2.2046226218;

export function formatBodyWeight(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return `${v.toFixed(1)} ${unit}`;
}

/**
 * Hero-style weight: rounded to the nearest whole unit. Used in compact surfaces (e.g. Dash body
 * hero) where the precise tenth-of-a-{unit} on the Body Composition page would feel too dense.
 * Always reuses {@link formatBodyWeight}'s `LBS_PER_KG` so kg ↔ lb conversion stays single-source.
 */
export function formatBodyHeroWeightLabel(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return `${Math.round(v)} ${unit}`;
}

/**
 * Spoken accessibility form, e.g. "159 pounds" / "72 kilograms". Pairs with
 * {@link formatBodyHeroWeightLabel} so the visual and screen-reader values
 * agree on the same rounded number.
 */
export function formatBodyHeroWeightAccessibilityLabel(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  const rounded = Math.round(v);
  const word = unit === "lb" ? "pounds" : "kilograms";
  return `${rounded} ${word}`;
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
