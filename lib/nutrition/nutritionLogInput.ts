// lib/nutrition/nutritionLogInput.ts
/** Keeps numeric fields stable while typing (no letters / multiple decimals). */

const MAX_FRACTION_DIGITS = 2;

/**
 * Allows digits and at most one `.`; strips other characters. Truncates excessive fractional digits.
 */
export function sanitizeNutritionAmountInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot >= 0) {
    const intPart = s.slice(0, dot).replace(/\./g, "");
    let frac = s.slice(dot + 1).replace(/\./g, "");
    if (frac.length > MAX_FRACTION_DIGITS) {
      frac = frac.slice(0, MAX_FRACTION_DIGITS);
    }
    s = `${intPart}.${frac}`;
  } else {
    s = s.replace(/\./g, "");
  }
  return s;
}
