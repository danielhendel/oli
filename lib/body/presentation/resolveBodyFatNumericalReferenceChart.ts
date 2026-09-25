/**
 * Resolve Body Fat numerical screening-reference chart presentation.
 * Pure — no UI, Firebase, or HealthKit.
 *
 * Stage 3C: ranges display as general educational screening reference.
 * Official personal classification remains withheld. A value-position indicator
 * may show where the current displayed measurement sits on the educational rail.
 */

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import type { BodyMassDisplayUnit } from "@/lib/body/presentation/bodyMetricPrimaryViews";
import { buildClassificationChartMarker } from "@/lib/body/presentation/resolveChartValueSegmentPlacement";
import {
  resolveBodyFatWeightPairing,
  resolveCompatibleFatMassKg,
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
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

export type BodyFatNumericalReferenceView = "percentage" | "fatMass";

export type ResolveBodyFatNumericalReferenceInput = {
  readonly ageYears: number | null;
  readonly sex: "female" | "male" | "unspecified" | null;
  readonly bodyFatPercent: number | null;
  readonly view: BodyFatNumericalReferenceView;
  readonly massDisplayUnit: BodyMassDisplayUnit;
  readonly evidence: BodyCompositionPairingEvidence;
  /** Reserved for future official marker eligibility; Apple Health transport alone is insufficient. */
  readonly measurementMethod: string | null;
};

/**
 * Builds a Weight-compatible classification chart model (3 segments).
 * Returns null when age/sex applicability fails (reference unavailable).
 * Official personal classification marker remains withheld; value-position
 * indicator may appear for the current displayed measurement only.
 */
export function resolveBodyFatNumericalReferenceChart(
  input: ResolveBodyFatNumericalReferenceInput,
): BodyMetricClassificationChartModel | null {
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

  let marker = null as ReturnType<typeof buildClassificationChartMarker>;
  if (input.view === "percentage") {
    const pct = input.bodyFatPercent;
    if (pct != null && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      const face = `${pct.toFixed(1)}%`;
      marker = buildClassificationChartMarker({
        kind: "value_position",
        value: pct,
        segments,
        formattedValue: face,
        accessibleLabel: `Current displayed Body Fat ${face} indicated on the educational reference. This is not an approved personal classification.`,
      });
    }
  } else if (massWeightKg != null) {
    const derived = resolveCompatibleFatMassKg(input.evidence);
    if (derived.status === "ready") {
      // Position uses percent domain so segment bounds stay consistent; label is mass.
      const pct = input.bodyFatPercent;
      if (pct != null && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
        const massLabel = formatBodyWeight(derived.valueKg, input.massDisplayUnit);
        marker = buildClassificationChartMarker({
          kind: "value_position",
          value: pct,
          segments,
          formattedValue: massLabel,
          accessibleLabel: `Current displayed Body Fat mass ${massLabel} indicated on the educational reference. This is not an approved personal classification.`,
        });
      }
    }
  }

  const markerNote =
    marker != null
      ? " A current-value indicator is shown for the displayed measurement only — not an approved personal classification."
      : " No personal placement is shown because the measurement method or reference population is not verified.";

  return {
    standardId: GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID,
    standardVersion: GALLAGHER_BODY_FAT_SCREENING_VERSION,
    contextLabel: "Screening reference",
    segments,
    marker,
    accessibleSummary:
      `Body Fat screening reference. ${rangeAnnouncement}${markerNote} ${GALLAGHER_GENERAL_REFERENCE_LIMITATION}.${massNote}`
        .replace(/\s+/g, " ")
        .trim(),
  };
}
