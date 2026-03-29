// lib/nutrition/nutritionLogForm.ts
/** Typed form parsing + validation for manual nutrition totals (no meal schema). */

export type NutritionLogFormFields = {
  totalKcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
};

export type NutritionLogFieldKey = keyof NutritionLogFormFields;

export type NutritionLogParsed = {
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type NutritionLogValidationResult =
  | { ok: true; values: NutritionLogParsed }
  | { ok: false; errors: Partial<Record<NutritionLogFieldKey, string>> };

const MAX_KCAL = 50_000;
const MAX_MACRO_G = 5_000;

function parseNonNegNumber(raw: string, label: string): { ok: true; n: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: false, message: `${label} is required` };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, message: `${label} must be a number` };
  if (n < 0) return { ok: false, message: `${label} cannot be negative` };
  return { ok: true, n };
}

/**
 * Validates string inputs from the log form. Fiber is optional (empty → null).
 */
export function validateNutritionLogForm(fields: NutritionLogFormFields): NutritionLogValidationResult {
  const errors: Partial<Record<NutritionLogFieldKey, string>> = {};

  const kcal = parseNonNegNumber(fields.totalKcal, "Calories");
  if (!kcal.ok) errors.totalKcal = kcal.message;
  else if (kcal.n > MAX_KCAL) errors.totalKcal = `Calories must be at most ${MAX_KCAL.toLocaleString()}`;

  const p = parseNonNegNumber(fields.proteinG, "Protein");
  if (!p.ok) errors.proteinG = p.message;
  else if (p.n > MAX_MACRO_G) errors.proteinG = `Too large (max ${MAX_MACRO_G} g)`;

  const c = parseNonNegNumber(fields.carbsG, "Carbs");
  if (!c.ok) errors.carbsG = c.message;
  else if (c.n > MAX_MACRO_G) errors.carbsG = `Too large (max ${MAX_MACRO_G} g)`;

  const f = parseNonNegNumber(fields.fatG, "Fat");
  if (!f.ok) errors.fatG = f.message;
  else if (f.n > MAX_MACRO_G) errors.fatG = `Too large (max ${MAX_MACRO_G} g)`;

  let fiberG: number | null = null;
  const ft = fields.fiberG.trim();
  if (ft !== "") {
    const fib = parseNonNegNumber(fields.fiberG, "Fiber");
    if (!fib.ok) errors.fiberG = fib.message;
    else if (fib.n > MAX_MACRO_G) errors.fiberG = `Too large (max ${MAX_MACRO_G} g)`;
    else fiberG = fib.n;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  if (!kcal.ok || !p.ok || !c.ok || !f.ok) {
    return { ok: false, errors: { ...errors, totalKcal: "Validation incomplete" } };
  }

  return {
    ok: true,
    values: {
      totalKcal: kcal.n,
      proteinG: p.n,
      carbsG: c.n,
      fatG: f.n,
      fiberG,
    },
  };
}
