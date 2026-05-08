// lib/body/bodyCompositionInterpretation.ts
// Profile-aware interpretation for Body Composition overview (v1).
// Hierarchy: use personalized gates when required profile fields exist; otherwise generic bars/messaging.

import type { UserProfileMain } from "@oli/contracts";
import { METRIC_BAR_RANGES } from "@/lib/metrics/metricRanges";
import {
  ageYearsFromProfileDateOfBirth,
  bodyFatFitnessThresholds,
  formatMassRangeForCopy,
  healthyWeightBandKg,
  leanMassRatioTolerance,
  mifflinStJeorBmrKcalPerDay,
  sexForBodyFatBands,
  type MassDisplayUnit,
} from "./bodyCompositionShared";
import { buildInterpretationBarModels, type InterpretationBarModel } from "./bodyOverviewInterpretationBar";

export type { InterpretationBarModel, InterpretationQualityZone } from "./bodyOverviewInterpretationBar";
export type { MassDisplayUnit } from "./bodyCompositionShared";

export {
  ageYearsFromProfileDateOfBirth,
  bodyFatFitnessThresholds,
  healthyWeightBandKg,
  mifflinStJeorBmrKcalPerDay,
} from "./bodyCompositionShared";

export type BodyOverviewMetrics = {
  weightKg: number | null;
  bodyFatPercent: number | null;
  bmi: number | null;
  leanBodyMassKg: number | null;
  restingMetabolicRateKcal: number | null;
};

export type InterpretationMode = "personalized" | "generic";

export type BodyMetricInterpretation = {
  /** Legacy value-scale progress (retained for callers/tests; overview UI uses `bar`). */
  progress01: number;
  /** Single concise line; null when nothing additive */
  subtitle: string | null;
  mode: InterpretationMode;
  bar: InterpretationBarModel;
};

export type BodyOverviewInterpretations = {
  weight: BodyMetricInterpretation;
  bmi: BodyMetricInterpretation;
  bodyFat: BodyMetricInterpretation;
  lean: BodyMetricInterpretation;
  rmr: BodyMetricInterpretation;
};

type BodyMetricInterpretationCore = Omit<BodyMetricInterpretation, "bar">;

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

function linearProgress(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return clamp01((value - min) / (max - min));
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

const BMI_BAR_MIN = 16;
const BMI_BAR_MAX = 34;

function bmiCategoryLabel(cat: BmiCategory): string {
  switch (cat) {
    case "underweight":
      return "Underweight (WHO band)";
    case "normal":
      return "Normal weight (WHO band)";
    case "overweight":
      return "Overweight (WHO band)";
    case "obese":
      return "Obese class I+ (WHO band)";
  }
}

/** ACE-style fitness-oriented reference window for progress bar (not clinical thresholds). Athletes: slightly wider span. */
export function bodyFatBarRange(
  sex: "male" | "female" | "unspecified",
  athleteMode: boolean,
): { min: number; max: number } {
  if (sex === "male") return athleteMode ? { min: 5, max: 34 } : { min: 6, max: 32 };
  if (sex === "female") return athleteMode ? { min: 12, max: 44 } : { min: 14, max: 42 };
  return athleteMode ? { min: 8, max: 42 } : { min: 10, max: 40 };
}

function bodyFatSubtitle(
  percent: number,
  sex: "male" | "female" | "unspecified",
  athleteMode: boolean,
): { text: string; mode: InterpretationMode } {
  if (sex === "unspecified") {
    return {
      mode: "generic",
      text: "Typical healthy ranges differ by sex — set sex at birth in Profile for tighter guidance.",
    };
  }
  const { fitnessLo, fitnessHi, averageHi } = bodyFatFitnessThresholds(sex, athleteMode);
  const label = sex === "male" ? "males" : "females";
  const athleteNote = athleteMode ? " Athlete mode: leaner training ranges are treated as more plausible." : "";

  if (percent < fitnessLo) {
    return {
      mode: "personalized",
      text: `Below a common “fitness” reference (${fitnessLo}–${fitnessHi}% for ${label}); context matters.${athleteNote}`,
    };
  }
  if (percent <= fitnessHi) {
    return {
      mode: "personalized",
      text: `Near a common “fitness” reference (${fitnessLo}–${fitnessHi}% for ${label}).${athleteNote}`,
    };
  }
  if (percent <= averageHi) {
    return {
      mode: "personalized",
      text: `Above the fitness band but within a common “average” range for ${label}.${athleteNote}`,
    };
  }
  return {
    mode: "personalized",
    text: `High vs common population bands for ${label}; not a diagnosis on its own.${athleteNote}`,
  };
}

function appendPrimaryGoalBmiNote(
  cat: BmiCategory,
  goal: UserProfileMain["bodyInputs"]["primaryGoal"],
): string | null {
  if (!goal) return null;
  if (goal === "lose_fat" && (cat === "overweight" || cat === "obese")) {
    return " Your primary goal is fat loss — sustainable pace beats extremes.";
  }
  if (goal === "build_muscle" && cat === "normal") {
    return " Muscle gain can nudge weight without being harmful.";
  }
  if (goal === "athletic_performance" && cat !== "underweight") {
    return " Performance-focused athletes often sit outside textbook BMI bands.";
  }
  return null;
}

export type WeightVsHealthyBmiBand = "below" | "within" | "above";

export function classifyWeightVsHealthyBmiBand(weightKg: number, heightCm: number): WeightVsHealthyBmiBand {
  const { bandLo, bandHi } = healthyWeightBandKg(heightCm);
  if (weightKg < bandLo) return "below";
  if (weightKg <= bandHi) return "within";
  return "above";
}

function weightBandClause(weightKg: number, heightCm: number, massUnit: MassDisplayUnit): string {
  const { bandLo, bandHi } = healthyWeightBandKg(heightCm);
  const rel = classifyWeightVsHealthyBmiBand(weightKg, heightCm);
  const range = formatMassRangeForCopy(bandLo, bandHi, massUnit);
  if (rel === "within") {
    return ` Your weight is inside the height-based healthy BMI band (${range}).`;
  }
  if (rel === "below") {
    return ` Your weight is below that band (${range}).`;
  }
  return ` Your weight is above that band (${range}).`;
}

function waistToHeightClause(profile: UserProfileMain): string | null {
  const h = profile.body.heightCm;
  const w = profile.bodyInputs.waistCircumferenceCm;
  if (h == null || w == null || h <= 0) return null;
  const ratio = w / h;
  const r = ratio.toFixed(2);
  if (ratio >= 0.52) {
    return ` Waist-to-height ${r} is above a common 0.50 benchmark (not diagnostic).`;
  }
  if (ratio < 0.5) {
    return ` Waist-to-height ${r} is below a common 0.50 benchmark (not diagnostic).`;
  }
  return ` Waist-to-height ${r} is near a common 0.50 benchmark (not diagnostic).`;
}

function interpretWeight(
  overview: BodyOverviewMetrics,
  profile: UserProfileMain,
  massUnit: MassDisplayUnit,
): BodyMetricInterpretationCore {
  const w = overview.weightKg;
  if (w == null) {
    return { progress01: 0, subtitle: null, mode: "generic" };
  }
  const heightCm = profile.body.heightCm;
  if (heightCm == null || heightCm <= 0) {
    const { min, max } = METRIC_BAR_RANGES.weight ?? { min: 40, max: 150 };
    return {
      progress01: linearProgress(w, min, max),
      subtitle: "Add height in Profile for a height-based healthy weight band.",
      mode: "generic",
    };
  }
  const { bandLo, bandHi } = healthyWeightBandKg(heightCm);
  const pad = Math.max(4, (bandHi - bandLo) * 0.4);
  const dispLo = Math.max(30, bandLo - pad);
  const dispHi = Math.min(220, bandHi + pad);
  const whClause = waistToHeightClause(profile);
  const range = formatMassRangeForCopy(bandLo, bandHi, massUnit);
  let subtitle = `For your height, BMI 18.5–24.9 is roughly ${range}.${weightBandClause(w, heightCm, massUnit)}${whClause ?? ""}`;
  if (profile.bodyInputs.primaryGoal === "maintain") {
    subtitle += " Maintaining often feels easiest near that band.";
  }
  return {
    progress01: linearProgress(w, dispLo, dispHi),
    subtitle: subtitle.trim(),
    mode: "personalized",
  };
}

function interpretBmi(overview: BodyOverviewMetrics, profile: UserProfileMain): BodyMetricInterpretationCore {
  const bmi = overview.bmi;
  if (bmi == null) {
    return { progress01: 0, subtitle: null, mode: "generic" };
  }
  const cat = classifyBmi(bmi);
  let subtitle = bmiCategoryLabel(cat);
  subtitle += appendPrimaryGoalBmiNote(cat, profile.bodyInputs.primaryGoal) ?? "";
  if (profile.bodyInputs.athleteMode && bmi >= 25) {
    subtitle += " Athlete mode: more muscle can raise BMI without reflecting excess fat.";
  } else if (profile.bodyInputs.athleteMode && cat === "normal" && bmi >= 23) {
    subtitle +=
      " Athlete mode: upper-normal BMI is common when carrying more lean mass (still WHO bands for context).";
  }
  return {
    progress01: linearProgress(bmi, BMI_BAR_MIN, BMI_BAR_MAX),
    subtitle: subtitle.trim(),
    mode: "personalized",
  };
}

function interpretBodyFat(overview: BodyOverviewMetrics, profile: UserProfileMain): BodyMetricInterpretationCore {
  const bf = overview.bodyFatPercent;
  if (bf == null) {
    return { progress01: 0, subtitle: null, mode: "generic" };
  }
  const sex = sexForBodyFatBands(profile.identity.sexAtBirth);
  const athlete = profile.bodyInputs.athleteMode;
  const { min, max } = bodyFatBarRange(sex, athlete);
  const { text, mode } = bodyFatSubtitle(bf, sex, athlete);
  return {
    progress01: linearProgress(bf, min, max),
    subtitle: text,
    mode,
  };
}

function interpretLean(overview: BodyOverviewMetrics, profile: UserProfileMain): BodyMetricInterpretationCore {
  const lean = overview.leanBodyMassKg;
  if (lean == null) {
    return { progress01: 0, subtitle: null, mode: "generic" };
  }
  const lowConfidence = overview.bodyFatPercent == null;
  if (lowConfidence) {
    return {
      progress01: 0.5,
      subtitle: "Conservative view: lean mass is easiest to interpret alongside body fat %.",
      mode: "generic",
    };
  }
  const w = overview.weightKg;
  const bf = overview.bodyFatPercent;
  if (w != null && bf != null) {
    const expectedLean = w * (1 - bf / 100);
    const ratio = expectedLean > 0 ? lean / expectedLean : 1;
    const tol = leanMassRatioTolerance(profile.bodyInputs.athleteMode);
    const lo = 1 - tol;
    const hi = 1 + tol;
    if (ratio >= lo && ratio <= hi) {
      const athleteNote = profile.bodyInputs.athleteMode
        ? " Athlete mode: allows a bit more lean variance vs the simple weight × (1 − body fat) check."
        : "";
      return {
        progress01: 0.5,
        subtitle: `Roughly consistent with weight × (1 − body fat).${athleteNote}`,
        mode: "personalized",
      };
    }
    return {
      progress01: 0.5,
      subtitle: "Differs from weight × (1 − body fat) — samples may be from different times or sources.",
      mode: "personalized",
    };
  }
  return {
    progress01: 0.5,
    subtitle: "Add weight to compare lean mass with your body fat snapshot.",
    mode: "generic",
  };
}

function interpretRmr(overview: BodyOverviewMetrics, profile: UserProfileMain): BodyMetricInterpretationCore {
  const rmr = overview.restingMetabolicRateKcal;
  if (rmr == null) {
    return { progress01: 0, subtitle: null, mode: "generic" };
  }
  const w = overview.weightKg;
  const h = profile.body.heightCm;
  const age = ageYearsFromProfileDateOfBirth(profile.identity.dateOfBirth);
  const canPredict = w != null && w > 0 && h != null && h > 0 && age != null;
  if (!canPredict) {
    return {
      progress01: 0.5,
      subtitle: "Add weight (from measurements), height, and date of birth in Profile for a rough resting baseline estimate.",
      mode: "generic",
    };
  }
  const predicted = mifflinStJeorBmrKcalPerDay({
    weightKg: w,
    heightCm: h,
    ageYears: age,
    sex: profile.identity.sexAtBirth,
  });
  if (predicted <= 0) {
    return { progress01: 0.5, subtitle: null, mode: "generic" };
  }
  const ratio = rmr / predicted;
  let subtitle: string;
  if (ratio >= 0.9 && ratio <= 1.1) {
    subtitle =
      "Near a Mifflin–St Jeor estimate from your profile (sex, age, height, weight; rough resting baseline, not medical advice).";
  } else if (ratio < 0.9) {
    subtitle = "Below a rough resting estimate from your profile — check inputs or discuss unexpected values with a clinician.";
  } else {
    subtitle = "Above a rough resting estimate from your profile — training and device differences matter.";
  }
  return {
    progress01: linearProgress(ratio, 0.75, 1.25),
    subtitle,
    mode: "personalized",
  };
}

/**
 * v1 overview interpretation. Each metric falls back to neutral/generic behavior when inputs are missing.
 */
export function buildBodyOverviewInterpretations(
  profile: UserProfileMain,
  overview: BodyOverviewMetrics,
  opts?: { massDisplayUnit?: MassDisplayUnit },
): BodyOverviewInterpretations {
  const massUnit = opts?.massDisplayUnit ?? "kg";
  const bars = buildInterpretationBarModels(overview, profile);
  return {
    weight: { ...interpretWeight(overview, profile, massUnit), bar: bars.weight },
    bmi: { ...interpretBmi(overview, profile), bar: bars.bmi },
    bodyFat: { ...interpretBodyFat(overview, profile), bar: bars.bodyFat },
    lean: { ...interpretLean(overview, profile), bar: bars.lean },
    rmr: { ...interpretRmr(overview, profile), bar: bars.rmr },
  };
}
