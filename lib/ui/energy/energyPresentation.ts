/**
 * Daily Energy presentation helpers — formatting and copy only (no calorie math).
 */

import type { DailyEnergyCardDto, DailyEnergyFactorDto } from "@/lib/data/dash/useDailyEnergyCard";

export type EnergyFactorDto = DailyEnergyFactorDto;

export type EnergyFactorRowKey = "baseline" | "steps" | "cardio" | "strength";

/** Display-only: formats backend low/high kcal range (no computation). */
export function formatEnergyRange(low: number, high: number): string {
  const a = Math.round(low).toLocaleString();
  const b = Math.round(high).toLocaleString();
  return `${a}\u2013${b} kcal`;
}

/**
 * Display-only: formats an averaged low/high kcal range as "{a}–{b} kcal/day".
 * Used by Energy Baseline rows. No calorie math here — both averages are computed upstream.
 */
export function formatEnergyAvgRangePerDay(avgLow: number, avgHigh: number): string {
  const a = Math.round(avgLow).toLocaleString();
  const b = Math.round(avgHigh).toLocaleString();
  return `${a}\u2013${b} kcal/day`;
}

/** Prefix + for additive burn lines (matches Daily Energy card). */
export function formatAdditiveEnergyRange(low: number, high: number): string {
  return `+${formatEnergyRange(low, high)}`;
}

export function formatFactorDisplayAdditive(factor: EnergyFactorDto | undefined): string | null {
  if (!factor) return null;
  if (typeof factor.kcalLow === "number" && typeof factor.kcalHigh === "number") {
    return formatAdditiveEnergyRange(factor.kcalLow, factor.kcalHigh);
  }
  if (typeof factor.kcal === "number") {
    return `+${Math.round(factor.kcal).toLocaleString()} kcal`;
  }
  return null;
}

export type EnergyFactorRow = {
  key: EnergyFactorRowKey;
  label: string;
  displayValue: string;
};

/** Rows to render on the card — only factors present in `energy.factors`. */
export function getEnergyFactorRows(energy: DailyEnergyCardDto): EnergyFactorRow[] {
  const f = energy.factors;
  const rows: EnergyFactorRow[] = [];

  const push = (key: EnergyFactorRowKey, label: string, factor: EnergyFactorDto | undefined) => {
    const displayValue = formatFactorDisplayAdditive(factor);
    if (!displayValue) return;
    rows.push({ key, label, displayValue });
  };

  push("baseline", "BMR", f.baseline);
  push("steps", "NEAT", f.steps);
  push("cardio", "Cardio", f.cardio);
  push("strength", "Strength", f.strength);

  return rows;
}

const INPUT_USED_LABELS: Record<string, string> = {
  "body.weightKg": "Body weight",
  "body.weightKg:lastKnown": "Body weight (last known)",
  "body.leanBodyMassKg": "Lean body mass",
  "body.bodyFatPercent": "Body fat percentage",
  "body.restingMetabolicRateKcal": "Resting metabolic rate",
  "body.restingMetabolicRateKcal:lastKnown": "Resting metabolic rate (last known)",
  "profile.heightCm": "Height",
  "profile.sexAtBirth": "Sex at birth",
  "profile.dateOfBirth": "Age (from date of birth)",
  steps: "Step count",
  "activity.stepsAllocation.neatSteps": "NEAT steps (workout steps excluded)",
  "activity.distanceKm": "Walking distance",
  "cardio.durationMinutes": "Cardio duration",
  trainingLoad: "Training load",
  "strength.durationMinutes": "Strength session duration",
  "strength.volumeKg": "Strength training volume",
  "strength.workoutsCount": "Strength workout sessions",
};

const INPUT_MISSING_LABELS: Record<string, string> = {
  "body.weightKg": "Body weight",
  "profile.heightCm": "Height",
  "profile.sexAtBirth": "Sex at birth",
  "profile.dateOfBirth": "Date of birth (for age)",
  "strength.volumeKg": "Strength volume detail",
  "strength.durationMinutes": "Strength session duration",
};

/** Human-readable bullet labels for `inputsUsed` tokens from backend. */
export function getFactorInputsUsedLabels(inputsUsed: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of inputsUsed) {
    const label = INPUT_USED_LABELS[raw] ?? raw.replace(/\./g, " · ");
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/** Human-readable labels for `inputsMissing` tokens. */
export function getFactorMissingInputLabels(inputsMissing: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of inputsMissing) {
    const label = INPUT_MISSING_LABELS[raw] ?? raw.replace(/\./g, " · ");
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export function bmrHasLeanMassSignal(factor: EnergyFactorDto): boolean {
  return factor.inputsUsed?.some((k) => k === "body.leanBodyMassKg" || k === "body.bodyFatPercent") ?? false;
}

export function bmrAccuracyNote(factor: EnergyFactorDto): string | null {
  if (bmrHasLeanMassSignal(factor)) {
    return "Because Oli has lean mass data, this estimate uses a tighter range.";
  }
  return null;
}

export function buildBmrPersonalizedParagraph(factor: EnergyFactorDto): string {
  const range = formatFactorDisplayAdditive(factor);
  const rangePart = range ?? "a range";
  return `Your BMR is estimated at ${rangePart} today. This is the energy your body likely uses at rest before steps, cardio, or workouts.`;
}

export function buildNeatPersonalizedParagraph(factor: EnergyFactorDto): string {
  const range = formatFactorDisplayAdditive(factor);
  const rangePart = range ?? "a range";
  return `Your NEAT is ${rangePart} today. This comes from movement outside planned exercise, estimated mainly from your steps and body weight.`;
}

export function buildCardioPersonalizedParagraph(
  factor: EnergyFactorDto,
  opts: { durationMinutes?: number },
): string {
  const range = formatFactorDisplayAdditive(factor);
  const rangePart = range ?? "a range";
  const mins = opts.durationMinutes;
  if (typeof mins === "number" && mins > 0) {
    const rounded = Math.round(mins);
    return `Your cardio added ${rangePart} today from your ${rounded}-minute session.`;
  }
  return `Your cardio added ${rangePart} today from logged cardio activity.`;
}

export function buildStrengthPersonalizedParagraph(factor: EnergyFactorDto): string {
  const range = formatFactorDisplayAdditive(factor);
  const rangePart = range ?? "a range";
  return `Your strength training added ${rangePart} today. Strength is estimated as a range because lifting energy depends on duration, rest time, density, and exercise intensity.`;
}

export function buildImproveAccuracyTip(args: {
  metric: "baseline" | "steps" | "cardio" | "strength";
  factor: EnergyFactorDto;
  energyMissingRequired: string[];
}): string | null {
  const { metric, factor, energyMissingRequired } = args;
  const missing = factor.inputsMissing ?? [];
  const missingLabels = getFactorMissingInputLabels(missing);
  if (missingLabels.length > 0) {
    return `Add ${missingLabels.join(", ")} to tighten this estimate.`;
  }
  if (metric === "baseline" && energyMissingRequired.includes("baseline")) {
    return "Log body weight and complete profile fields (age, sex, height) to improve BMR.";
  }
  if (metric === "steps" && energyMissingRequired.includes("steps")) {
    return "Sync or log steps for today to improve NEAT.";
  }
  if (metric === "cardio") {
    return "Log cardio sessions with duration for a more precise cardio burn range.";
  }
  if (metric === "strength") {
    return "Log sets with loads (and session duration when possible) for a tighter strength estimate.";
  }
  return null;
}
