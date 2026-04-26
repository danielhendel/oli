/** Consistent grouping for workout log numerics (volume, reps, weight). */
const LOCALE = "en-US";

export function formatWorkoutLogInteger(n: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(n);
}

export function formatWorkoutLogDecimal(n: number, maxFractionDigits: number): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(n);
}
