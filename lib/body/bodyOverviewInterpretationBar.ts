// lib/body/bodyOverviewInterpretationBar.ts
// Quality zones for Body Composition overview bars (pure; no UI).
import type { UserProfileMain } from "@oli/contracts";
import type { BodyOverviewMetrics } from "./bodyCompositionInterpretation";
import {
  ageYearsFromProfileDateOfBirth,
  bodyFatFitnessThresholds,
  healthyWeightBandKg,
  leanMassRatioTolerance,
  mifflinStJeorBmrKcalPerDay,
  sexForBodyFatBands,
} from "./bodyCompositionShared";

export type InterpretationQualityZone = "out_of_range" | "fair" | "good" | "optimal";

export type InterpretationBarModel = {
  /** 0–1 position of the value marker on the track (ignored when hasValue is false). */
  marker01: number;
  zone: InterpretationQualityZone;
  /** Compact label under the bar ("No data" when the metric value is missing). */
  displayLabel: string;
  hasValue: boolean;
};

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

export function interpretationZoneFromMarker01(marker01: number): InterpretationQualityZone {
  const x = clamp01(marker01);
  if (x < 0.25) return "out_of_range";
  if (x < 0.5) return "fair";
  if (x < 0.75) return "good";
  return "optimal";
}

export function interpretationZoneDisplayLabel(zone: InterpretationQualityZone): string {
  switch (zone) {
    case "out_of_range":
      return "Out of range";
    case "fair":
      return "Fair";
    case "good":
      return "Good";
    case "optimal":
      return "Optimal";
  }
}

function barFromMarker(marker01: number, hasValue: boolean): InterpretationBarModel {
  if (!hasValue) {
    return {
      marker01: 0.5,
      zone: "fair",
      displayLabel: "No data",
      hasValue: false,
    };
  }
  const m = clamp01(marker01);
  const zone = interpretationZoneFromMarker01(m);
  return {
    marker01: m,
    zone,
    displayLabel: interpretationZoneDisplayLabel(zone),
    hasValue: true,
  };
}

function weightQualityMarker01(
  w: number,
  bandLo: number,
  bandHi: number,
  dispLo: number,
  dispHi: number,
): number {
  const mid = (bandLo + bandHi) / 2;
  const half = (bandHi - bandLo) / 2;
  if (half <= 0) return 0.5;
  if (w >= bandLo && w <= bandHi) {
    const distFromMid = Math.abs(w - mid) / half;
    return 0.75 + 0.25 * (1 - Math.min(1, distFromMid));
  }
  if (w < bandLo) {
    const span = Math.max(0.5, bandLo - dispLo);
    const t = clamp01((w - dispLo) / span);
    return t * 0.35;
  }
  const span = Math.max(0.5, dispHi - bandHi);
  const t = clamp01((dispHi - w) / span);
  return 0.35 * t;
}

function bmiQualityMarker01(bmi: number): number {
  if (bmi >= 18.5 && bmi <= 24.9) {
    const mid = 21.7;
    const half = 3.2;
    const dist = Math.abs(bmi - mid) / half;
    return 0.76 + 0.24 * (1 - Math.min(1, dist));
  }
  if (bmi >= 17 && bmi < 18.5) {
    return 0.32 + 0.2 * clamp01((bmi - 17) / 1.5);
  }
  if (bmi > 24.9 && bmi <= 28) {
    return 0.38 + 0.18 * clamp01((28 - bmi) / 3.1);
  }
  if (bmi < 17) {
    return clamp01(bmi / 17) * 0.28;
  }
  if (bmi > 28) {
    return Math.max(0.08, 0.35 - (bmi - 28) * 0.025);
  }
  return 0.42;
}

function bodyFatQualityMarker01(
  bf: number,
  sex: "male" | "female" | "unspecified",
  athleteMode: boolean,
): number {
  if (sex === "unspecified") return 0.48;
  const { fitnessLo, fitnessHi, averageHi } = bodyFatFitnessThresholds(sex, athleteMode);
  const midFit = (fitnessLo + fitnessHi) / 2;
  const halfFit = (fitnessHi - fitnessLo) / 2;
  if (bf >= fitnessLo && bf <= fitnessHi && halfFit > 0) {
    const dist = Math.abs(bf - midFit) / halfFit;
    return 0.74 + 0.26 * (1 - Math.min(1, dist));
  }
  if (bf < fitnessLo) {
    const span = Math.max(1, fitnessLo - 3);
    return clamp01((bf - 3) / span) * 0.38;
  }
  if (bf <= averageHi) {
    const span = Math.max(1, averageHi - fitnessHi);
    return 0.38 + 0.28 * clamp01(1 - (bf - fitnessHi) / span);
  }
  return Math.max(0.1, 0.32 - (bf - averageHi) * 0.02);
}

function leanQualityMarker01(ratio: number, tol: number): number {
  const lo = 1 - tol;
  const hi = 1 + tol;
  if (ratio >= lo && ratio <= hi) {
    const mid = 1;
    const half = tol;
    const dist = Math.abs(ratio - mid) / half;
    return 0.72 + 0.28 * (1 - Math.min(1, dist));
  }
  if (ratio < lo) {
    return clamp01(ratio / lo) * 0.38;
  }
  return clamp01((2 - ratio) / (2 - hi)) * 0.38;
}

function rmrQualityMarker01(ratio: number): number {
  if (ratio >= 0.9 && ratio <= 1.1) {
    const dist = Math.abs(ratio - 1) / 0.1;
    return 0.75 + 0.25 * (1 - Math.min(1, dist));
  }
  if (ratio < 0.9) {
    return clamp01(ratio / 0.9) * 0.42;
  }
  return clamp01((1.35 - ratio) / 0.25) * 0.42;
}

export function buildInterpretationBarModels(
  overview: BodyOverviewMetrics,
  profile: UserProfileMain,
): {
  weight: InterpretationBarModel;
  bmi: InterpretationBarModel;
  bodyFat: InterpretationBarModel;
  lean: InterpretationBarModel;
  rmr: InterpretationBarModel;
} {
  const w = overview.weightKg;
  const heightCm = profile.body.heightCm;

  let weightBar: InterpretationBarModel;
  if (w == null) {
    weightBar = barFromMarker(0.5, false);
  } else if (heightCm == null || heightCm <= 0) {
    weightBar = barFromMarker(0.46, true);
  } else {
    const { bandLo, bandHi } = healthyWeightBandKg(heightCm);
    const pad = Math.max(4, (bandHi - bandLo) * 0.4);
    const dispLo = Math.max(30, bandLo - pad);
    const dispHi = Math.min(220, bandHi + pad);
    const m = weightQualityMarker01(w, bandLo, bandHi, dispLo, dispHi);
    weightBar = barFromMarker(m, true);
  }

  const bmi = overview.bmi;
  const bmiBar = bmi == null ? barFromMarker(0.5, false) : barFromMarker(bmiQualityMarker01(bmi), true);

  const bf = overview.bodyFatPercent;
  let bodyFatBar: InterpretationBarModel;
  if (bf == null) {
    bodyFatBar = barFromMarker(0.5, false);
  } else {
    const sex = sexForBodyFatBands(profile.identity.sexAtBirth);
    const m = bodyFatQualityMarker01(bf, sex, profile.bodyInputs.athleteMode);
    bodyFatBar = barFromMarker(m, true);
  }

  const lean = overview.leanBodyMassKg;
  let leanBar: InterpretationBarModel;
  if (lean == null) {
    leanBar = barFromMarker(0.5, false);
  } else if (overview.bodyFatPercent == null) {
    leanBar = barFromMarker(0.44, true);
  } else {
    const wk = overview.weightKg;
    const bfp = overview.bodyFatPercent;
    if (wk != null && bfp != null) {
      const expected = wk * (1 - bfp / 100);
      const ratio = expected > 0 ? lean / expected : 1;
      const tol = leanMassRatioTolerance(profile.bodyInputs.athleteMode);
      leanBar = barFromMarker(leanQualityMarker01(ratio, tol), true);
    } else {
      leanBar = barFromMarker(0.44, true);
    }
  }

  const rmr = overview.restingMetabolicRateKcal;
  let rmrBar: InterpretationBarModel;
  if (rmr == null) {
    rmrBar = barFromMarker(0.5, false);
  } else {
    const wk = overview.weightKg;
    const h = profile.body.heightCm;
    const dob = profile.identity.dateOfBirth;
    const canPredict =
      wk != null &&
      wk > 0 &&
      h != null &&
      h > 0 &&
      dob != null &&
      /^\d{4}-\d{2}-\d{2}$/.test(dob);
    if (!canPredict) {
      rmrBar = barFromMarker(0.45, true);
    } else {
      const ageY = ageYearsFromProfileDateOfBirth(dob);
      if (ageY == null) {
        rmrBar = barFromMarker(0.45, true);
      } else {
        const predicted = mifflinStJeorBmrKcalPerDay({
          weightKg: wk,
          heightCm: h,
          ageYears: ageY,
          sex: profile.identity.sexAtBirth,
        });
        if (predicted <= 0) {
          rmrBar = barFromMarker(0.45, true);
        } else {
          rmrBar = barFromMarker(rmrQualityMarker01(rmr / predicted), true);
        }
      }
    }
  }

  return { weight: weightBar, bmi: bmiBar, bodyFat: bodyFatBar, lean: leanBar, rmr: rmrBar };
}
