/**
 * Continuous Weight→kg classification bands for the Weight trend chart background.
 * Reuses CDC/WHO adult BMI screening thresholds + height conversion — no duplicate cutoffs.
 * Fail-closed when height missing or age ineligible (same posture as Weight card).
 */

import type { BodyMetricClassificationTone } from "@/lib/ui/theme/bodyMetricClassificationChrome";
import {
  CDC_WHO_ADULT_BMI_AXIS,
  CDC_WHO_ADULT_BMI_SCREENING_STANDARD,
  type CdcWhoAdultBmiClassId,
  weightKgForBmiAtHeight,
} from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";

export type WeightTrendClassificationBand = {
  readonly id: CdcWhoAdultBmiClassId;
  readonly label: string;
  readonly tone: BodyMetricClassificationTone;
  /** Lower weight bound in kg (inclusive when finite). Null = open below. */
  readonly lowerKg: number | null;
  /** Upper weight bound in kg (exclusive when finite). Null = open above. */
  readonly upperKg: number | null;
};

export type WeightTrendClassificationBandsModel =
  | {
      readonly status: "ready";
      readonly bands: readonly WeightTrendClassificationBand[];
      /** BMI 18.5 / 25 / 30 mapped to kg at height — for Y-domain expansion. */
      readonly boundariesKg: readonly [number, number, number];
      /** Soft open-end extents from BMI axis (15 / 40) at height. */
      readonly softExtentKg: readonly [number, number];
    }
  | {
      readonly status: "unavailable";
      readonly reason: "missing_height" | "invalid_height" | "age_ineligible";
    };

const TONE_BY_ID: Record<CdcWhoAdultBmiClassId, BodyMetricClassificationTone> = {
  underweight: "cool",
  healthy_weight: "reference",
  overweight: "caution",
  obesity: "elevated",
};

/**
 * Build continuous kg bands for chart background from approved BMI screening cutoffs.
 */
export function buildWeightTrendClassificationBands(args: {
  readonly heightCm: number | null | undefined;
  readonly ageYears: number | null | undefined;
}): WeightTrendClassificationBandsModel {
  const heightCm = args.heightCm;
  if (heightCm == null || !Number.isFinite(heightCm)) {
    return { status: "unavailable", reason: "missing_height" };
  }
  if (heightCm <= 0) {
    return { status: "unavailable", reason: "invalid_height" };
  }

  const ageYears = args.ageYears;
  const minAge = CDC_WHO_ADULT_BMI_SCREENING_STANDARD.applicableAge.minimumYears ?? 20;
  if (ageYears == null || !Number.isFinite(ageYears) || ageYears < minAge) {
    return { status: "unavailable", reason: "age_ineligible" };
  }

  const kg185 = weightKgForBmiAtHeight(18.5, heightCm);
  const kg25 = weightKgForBmiAtHeight(25, heightCm);
  const kg30 = weightKgForBmiAtHeight(30, heightCm);
  const kgSoftMin = weightKgForBmiAtHeight(CDC_WHO_ADULT_BMI_AXIS.min, heightCm);
  const kgSoftMax = weightKgForBmiAtHeight(CDC_WHO_ADULT_BMI_AXIS.max, heightCm);
  if (
    kg185 == null ||
    kg25 == null ||
    kg30 == null ||
    kgSoftMin == null ||
    kgSoftMax == null
  ) {
    return { status: "unavailable", reason: "invalid_height" };
  }

  const bands: WeightTrendClassificationBand[] = [
    {
      id: "underweight",
      label: "Underweight",
      tone: TONE_BY_ID.underweight,
      lowerKg: null,
      upperKg: kg185,
    },
    {
      id: "healthy_weight",
      label: "Healthy Weight",
      tone: TONE_BY_ID.healthy_weight,
      lowerKg: kg185,
      upperKg: kg25,
    },
    {
      id: "overweight",
      label: "Overweight",
      tone: TONE_BY_ID.overweight,
      lowerKg: kg25,
      upperKg: kg30,
    },
    {
      id: "obesity",
      label: "Obesity",
      tone: TONE_BY_ID.obesity,
      lowerKg: kg30,
      upperKg: null,
    },
  ];

  return {
    status: "ready",
    bands,
    boundariesKg: [kg185, kg25, kg30],
    softExtentKg: [kgSoftMin, kgSoftMax],
  };
}

/**
 * Clip a band to the visible Y domain (kg). Returns null if fully outside.
 */
export function clipWeightTrendBandToDomain(args: {
  readonly band: WeightTrendClassificationBand;
  readonly displayMinKg: number;
  readonly displayMaxKg: number;
  readonly softMinKg: number;
  readonly softMaxKg: number;
}): { readonly lowerKg: number; readonly upperKg: number } | null {
  const lo =
    args.band.lowerKg == null ? args.softMinKg : args.band.lowerKg;
  const hi =
    args.band.upperKg == null ? args.softMaxKg : args.band.upperKg;
  const clippedLo = Math.max(lo, args.displayMinKg);
  const clippedHi = Math.min(hi, args.displayMaxKg);
  if (!(clippedHi > clippedLo)) return null;
  return { lowerKg: clippedLo, upperKg: clippedHi };
}
