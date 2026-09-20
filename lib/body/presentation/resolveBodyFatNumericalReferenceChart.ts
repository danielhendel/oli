/**
 * Resolve Body Fat numerical screening-reference chart presentation.
 * Pure — no UI, Firebase, or HealthKit.
 *
 * Stage 3C: ranges display as general educational screening reference.
 * Personal marker remains withheld — combined AA/White table is not a verified
 * personal reference-population assignment, and Apple Health transport alone is
 * not a compatible measurement method.
 */

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import type { BodyMassDisplayUnit } from "@/lib/body/presentation/bodyMetricPrimaryViews";
import {
  resolveBodyFatWeightPairing,
  type BodyCompositionPairingEvidence,
} from "@/lib/body/presentation/resolveCompatibleBodyCompositionDerivation";
import {
  GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID,
  GALLAGHER_BODY_FAT_SCREENING_VERSION,
  GALLAGHER_GENERAL_REFERENCE_LIMITATION,
  formatGallagherMassRange,
  formatGallagherMassRangeAccessible,
  formatGallagherPercentRange,
  formatGallagherPercentRangeAccessible,
  lookupGallagherCombinedTable,
} from "@/lib/body/standards/gallagherBodyFatScreeningReference";

export type BodyFatNumericalReferenceView = "percentage" | "fatMass";

export type ResolveBodyFatNumericalReferenceInput = {
  readonly ageYears: number | null;
  readonly sex: "female" | "male" | "unspecified" | null;
  readonly bodyFatPercent: number | null;
  readonly view: BodyFatNumericalReferenceView;
  readonly massDisplayUnit: BodyMassDisplayUnit;
  readonly evidence: BodyCompositionPairingEvidence;
  /** Reserved for future marker eligibility; Apple Health transport alone is insufficient. */
  readonly measurementMethod: string | null;
};

/**
 * Builds a Weight-compatible classification chart model (3 segments).
 * Returns null when age/sex applicability fails (reference unavailable).
 * Marker is always null under current Stage 3C eligibility policy.
 */
export function resolveBodyFatNumericalReferenceChart(
  input: ResolveBodyFatNumericalReferenceInput,
): BodyMetricClassificationChartModel | null {
  void input.bodyFatPercent;
  void input.measurementMethod;

  const lookup = lookupGallagherCombinedTable({
    ageYears: input.ageYears,
    sex: input.sex,
  });
  if (lookup.status !== "ready") {
    return null;
  }

  const { table } = lookup;
  let massWeightKg: number | null = null;
  if (input.view === "fatMass") {
    const pairing = resolveBodyFatWeightPairing(input.evidence);
    if (pairing.status === "compatible") {
      massWeightKg = pairing.weightKg;
    }
  }

  const segments = table.bands.map((band) => {
    const formattedRange =
      input.view === "fatMass"
        ? massWeightKg != null
          ? formatGallagherMassRange({
              band,
              weightKg: massWeightKg,
              massDisplayUnit: input.massDisplayUnit,
            })
          : "—"
        : formatGallagherPercentRange(band);
    return {
      id: band.id,
      label: band.label,
      formattedRange,
      tone: band.tone,
      lowerBound: band.lowerBound,
      upperBound: band.upperBound,
      lowerInclusive: band.lowerInclusive,
      upperInclusive: band.upperInclusive,
    };
  });

  const rangeAnnouncement = table.bands
    .map((band, i) => {
      const access =
        input.view === "fatMass" && massWeightKg != null
          ? formatGallagherMassRangeAccessible({
              band,
              weightKg: massWeightKg,
              massDisplayUnit: input.massDisplayUnit,
            })
          : input.view === "fatMass"
            ? "mass range unavailable"
            : formatGallagherPercentRangeAccessible(band);
      return `${segments[i]!.label}, ${access}.`;
    })
    .join(" ");

  const massNote =
    input.view === "fatMass" && massWeightKg == null
      ? " A compatible Weight measurement is needed to calculate Body Fat mass reference ranges."
      : "";

  return {
    standardId: GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID,
    standardVersion: GALLAGHER_BODY_FAT_SCREENING_VERSION,
    contextLabel: "Screening reference",
    segments,
    marker: null,
    accessibleSummary:
      `Body Fat screening reference. ${rangeAnnouncement} No personal placement is shown because the measurement method or reference population is not verified. ${GALLAGHER_GENERAL_REFERENCE_LIMITATION}.${massNote}`
        .replace(/\s+/g, " ")
        .trim(),
  };
}
