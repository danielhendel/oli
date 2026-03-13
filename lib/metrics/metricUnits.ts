// lib/metrics/metricUnits.ts
// Unit conversion and formatting helpers for metric display.

/**
 * Format sleep duration from total minutes to "Xh" or "Xh Ym".
 */
export function formatSleepMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format step count with locale string and " steps" suffix.
 */
export function formatSteps(count: number): string {
  return `${count.toLocaleString()} steps`;
}

/**
 * Convert kilograms to pounds.
 */
export function kgToLbs(kg: number): number {
  return kg * 2.2046226218;
}

/**
 * Format grams for macros (e.g. protein, carbs, fat).
 */
export function formatGrams(g: number): string {
  return `${g} g`;
}
