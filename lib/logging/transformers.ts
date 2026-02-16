// lib/logging/transformers.ts
import type { AnyPayload } from "./writeEvent";

export type ValidationIssue = { path: string; message: string };
export type ValidationResult<T> = { ok: true; data: T } | { ok: false; issues: ValidationIssue[] };

export function ok<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}
export function err(path: string, message: string): ValidationResult<AnyPayload> {
  return { ok: false, issues: [{ path, message }] };
}

// Drafts
export type WorkoutDraft = {
  exercises?: Array<{ name?: string; sets?: Array<{ reps?: number; weight?: number }> }>;
  durationMs?: number;
};

export type CardioDraft = {
  distanceKm?: number;
  /** UI convenience; converted to ms if provided */
  durationMin?: number;
  durationMs?: number;
  rpe?: number;
  modality?: "run" | "row" | "cycle" | "swim";
};

type MealPart = { calories?: number; protein?: number };
export type NutritionDraft = {
  totals?: { calories?: number; protein?: number };
  meals?: { breakfast?: MealPart; lunch?: MealPart; dinner?: MealPart; snacks?: MealPart };
};

export type RecoveryDraft = { sleepMin?: number; hrv?: number; rhr?: number };

// workout
export function toWorkoutPayload(d: WorkoutDraft): ValidationResult<AnyPayload> {
  const exercises = (d.exercises ?? [])
    .map((ex) => {
      const sets = (ex.sets ?? [])
        .filter((s) => s.reps !== undefined || s.weight !== undefined)
        .map((s) => ({
          ...(typeof s.reps === "number" ? { reps: s.reps } : {}),
          ...(typeof s.weight === "number" ? { weight: s.weight } : {}),
        }));
      return { ...(ex.name ? { name: ex.name } : {}), sets };
    })
    .filter((ex) => ex.sets.length > 0);

  if (exercises.length === 0) {
    return err("exercises", "At least one set with reps or weight is required.");
  }

  const out: AnyPayload & { durationMs?: number } = { exercises };
  if (typeof d.durationMs === "number") out.durationMs = d.durationMs;
  return ok(out);
}

// cardio
export function toCardioPayload(d: CardioDraft): ValidationResult<AnyPayload> {
  const ms = typeof d.durationMs === "number"
    ? d.durationMs
    : typeof d.durationMin === "number"
    ? Math.round(d.durationMin * 60_000)
    : undefined;

  const hasDistance = typeof d.distanceKm === "number";
  if (!hasDistance && typeof ms !== "number") {
    return err("cardio", "Provide distance, duration, or both.");
  }

  const out: AnyPayload & {
    distanceKm?: number; durationMs?: number; rpe?: number; modality?: string;
  } = {};
  if (hasDistance) out.distanceKm = d.distanceKm as number;
  if (typeof ms === "number") out.durationMs = ms;
  if (typeof d.rpe === "number") out.rpe = d.rpe;
  if (d.modality) out.modality = d.modality;
  return ok(out);
}

// nutrition
function cleanPart(p?: MealPart): MealPart | undefined {
  if (!p) return undefined;
  const out: MealPart = {};
  if (typeof p.calories === "number") out.calories = p.calories;
  if (typeof p.protein === "number") out.protein = p.protein;
  return Object.keys(out).length ? out : undefined;
}

export function toNutritionPayload(d: NutritionDraft): ValidationResult<AnyPayload> {
  const meals = {
    breakfast: cleanPart(d.meals?.breakfast),
    lunch: cleanPart(d.meals?.lunch),
    dinner: cleanPart(d.meals?.dinner),
    snacks: cleanPart(d.meals?.snacks),
  };

  const totals =
    typeof d.totals?.calories === "number" || typeof d.totals?.protein === "number"
      ? {
          ...(typeof d.totals?.calories === "number" ? { calories: d.totals.calories } : {}),
          ...(typeof d.totals?.protein === "number" ? { protein: d.totals.protein } : {}),
        }
      : undefined;

  const anyMeals = meals.breakfast || meals.lunch || meals.dinner || meals.snacks || undefined;
  if (!totals && !anyMeals) {
    return err("nutrition", "Enter totals or at least one meal.");
  }

  const out: AnyPayload & { totals?: { calories?: number; protein?: number }; meals?: typeof meals } = {};
  if (totals) out.totals = totals;
  if (anyMeals) out.meals = meals;
  return ok(out);
}

// recovery
export function toRecoveryPayload(d: RecoveryDraft): ValidationResult<AnyPayload> {
  const out: AnyPayload & { sleepMin?: number; hrv?: number; rhr?: number } = {};
  if (typeof d.sleepMin === "number") out.sleepMin = d.sleepMin;
  if (typeof d.hrv === "number") out.hrv = d.hrv;
  if (typeof d.rhr === "number") out.rhr = d.rhr;

  if (!("sleepMin" in out) && !("hrv" in out) && !("rhr" in out)) {
    return err("recovery", "Provide sleep, HRV, or RHR.");
  }
  return ok(out);
}
