/**
 * Synthetic fixtures for Dual Score engine tests.
 * Public synthetic values only — no PHI / filenames / URLs.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
} from "@oli/contracts";

import {
  calculateAlmiObservation,
  calculateFfmiObservation,
  calculateFmiObservation,
  calculateWhtrObservation,
} from "../formulas";
import { resolveBodyCompositionEvidence } from "../resolver/resolveBodyCompositionEvidence";
import {
  AS_OF,
  baseObservation,
  bundleWith,
  heightObservation,
  whoWaist,
} from "../resolver/testFixtures";
import { scoreHealthComposition } from "./scoreHealthComposition";
import { scorePerformanceSupportingComposition } from "./scorePerformanceSupportingComposition";

export { AS_OF };

/** Adult DOB (≥20 at AS_OF 2026-06-01). */
export const ADULT_DOB = "1990-01-15";

export function adultBundle(
  observations: BodyCompositionEvidenceObservation[],
  args: {
    sexAtBirth?: "male" | "female" | "intersex" | "unspecified" | null;
    dateOfBirth?: string | null;
    heightCm?: number | null;
  } = {},
): BodyCompositionEvidenceBundle {
  const sexAtBirth = args.sexAtBirth === undefined ? "male" : args.sexAtBirth;
  const dateOfBirth = args.dateOfBirth === undefined ? ADULT_DOB : args.dateOfBirth;
  const heightCm = args.heightCm === undefined ? 180 : args.heightCm;
  const base = bundleWith(observations);
  return {
    ...base,
    subjectContext: {
      ...base.subjectContext,
      sexAtBirth,
      dateOfBirth,
      height: {
        valueCm: heightCm,
        effectiveAt: heightCm != null ? "2020-01-01T00:00:00.000Z" : null,
        sourceSystem: heightCm != null ? "manual" : null,
      },
    },
  };
}

export function dxaFatMass(args: {
  id?: string;
  valueKg?: number;
  measuredAt?: string;
  scanRef?: string | null;
  method?: "dxa" | "consumer_bia";
}): BodyCompositionEvidenceObservation {
  return baseObservation({
    observationId: args.id ?? "fm1",
    metricKey: "fat_mass",
    value: args.valueKg ?? 15,
    measuredAt: args.measuredAt ?? "2026-05-01T00:00:00.000Z",
    constructEligibility: ["H2", "P3"],
    redundancyGroup: "bf_fat_mass_fmi",
    source: {
      sourceSystem: "body_scan",
      measurementMethod: args.method ?? "dxa",
      deviceFamily: null,
      deviceModel: null,
    },
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: args.scanRef ?? "scan_1",
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: null,
      inputObservationRefs: null,
      corrected: null,
      protocolId: null,
      protocolVersion: null,
    },
  });
}

export function dxaFfm(args: {
  id?: string;
  valueKg?: number;
  measuredAt?: string;
  scanRef?: string | null;
  method?: "dxa" | "consumer_bia";
}): BodyCompositionEvidenceObservation {
  return baseObservation({
    observationId: args.id ?? "ffm1",
    metricKey: "fat_free_mass",
    value: args.valueKg ?? 60,
    measuredAt: args.measuredAt ?? "2026-05-01T00:00:00.000Z",
    constructEligibility: ["H3", "P1"],
    redundancyGroup: "lean_ffm_ffmi",
    source: {
      sourceSystem: "body_scan",
      measurementMethod: args.method ?? "dxa",
      deviceFamily: null,
      deviceModel: null,
    },
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: args.scanRef ?? "scan_1",
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: null,
      inputObservationRefs: null,
      corrected: null,
      protocolId: null,
      protocolVersion: null,
    },
  });
}

export function limbLean(args: {
  id: string;
  region: "left_arm" | "right_arm" | "left_leg" | "right_leg";
  valueKg: number;
  measuredAt?: string;
  scanRef?: string | null;
}): BodyCompositionEvidenceObservation {
  return baseObservation({
    observationId: args.id,
    metricKey: "lean_mass",
    region: args.region,
    value: args.valueKg,
    measuredAt: args.measuredAt ?? "2026-05-01T00:00:00.000Z",
    constructEligibility: ["P2"],
    redundancyGroup: "appendicular_lean_almi",
    source: {
      sourceSystem: "body_scan",
      measurementMethod: "dxa",
      deviceFamily: null,
      deviceModel: null,
    },
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: args.scanRef ?? "scan_1",
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: null,
      inputObservationRefs: null,
      corrected: null,
      protocolId: null,
      protocolVersion: null,
    },
  });
}

/** Build a fully-resolved Health-capable synthetic bundle (H1+H2+H3). */
export function healthReadyBundle(args: {
  sex?: "male" | "female";
  whtr?: number;
  fmi?: number;
  almi?: number;
  measuredAt?: string;
  dateOfBirth?: string | null;
  heightCm?: number;
}): BodyCompositionEvidenceBundle {
  const sex = args.sex ?? "male";
  const heightCm = args.heightCm ?? 180;
  const measuredAt = args.measuredAt ?? "2026-05-01T00:00:00.000Z";
  // Height must be age-eligible for H1 (Waist/Height are H1 scoring inputs).
  const height = heightObservation({ id: "h1", valueCm: heightCm, measuredAt });
  // WHtR = waist/height → waist = whtr * height
  const whtrTarget = args.whtr ?? 0.45;
  const waistCm = whtrTarget * heightCm;
  const waist = whoWaist({ id: "w1", valueCm: waistCm, measuredAt });
  const whtr = calculateWhtrObservation({
    waistCm,
    heightCm,
    measuredAt,
    inputObservationRefs: ["w1", "h1"],
  });
  if (!whtr.ok) throw new Error("whtr calc failed");

  // FMI = FM / h^2 → FM = fmi * h^2
  const fmiTarget = args.fmi ?? 5;
  const heightM = heightCm / 100;
  const fatMassKg = fmiTarget * heightM * heightM;
  const fm = dxaFatMass({ id: "fm1", valueKg: fatMassKg, measuredAt, scanRef: "scan_1" });
  const fmi = calculateFmiObservation({
    fatMassKg,
    heightCm,
    measuredAt,
    inputObservationRefs: ["fm1", "h1"],
  });
  if (!fmi.ok) throw new Error("fmi calc failed");
  // Copy scanRef onto calculated FMI for same-scan era zeroing with lean
  fmi.observation = {
    ...fmi.observation,
    provenance: { ...fmi.observation.provenance, scanRef: "scan_1" },
    source: {
      ...fmi.observation.source,
      measurementMethod: "other",
    },
  };

  // ALMI ≈ sum limbs / h^2 — distribute evenly
  const almiTarget = args.almi ?? (sex === "male" ? 8.0 : 6.3);
  const almiKg = almiTarget * heightM * heightM;
  const each = almiKg / 4;
  const limbs = (
    [
      ["arm_l", "left_arm"],
      ["arm_r", "right_arm"],
      ["leg_l", "left_leg"],
      ["leg_r", "right_leg"],
    ] as const
  ).map(([id, region]) =>
    limbLean({ id, region, valueKg: each, measuredAt, scanRef: "scan_1" }),
  );
  const almi = calculateAlmiObservation({
    appendicularLeanMassKg: almiKg,
    heightCm,
    measuredAt,
    inputObservationRefs: [...limbs.map((l) => l.observationId), "h1"],
  });
  if (!almi.ok) throw new Error("almi calc failed");
  almi.observation = {
    ...almi.observation,
    provenance: {
      ...almi.observation.provenance,
      scanRef: "scan_1",
    },
  };

  const adultArgs: {
    sexAtBirth: "male" | "female";
    heightCm: number;
    dateOfBirth?: string | null;
  } = { sexAtBirth: sex, heightCm };
  if (args.dateOfBirth !== undefined) adultArgs.dateOfBirth = args.dateOfBirth;
  return adultBundle(
    [height, waist, whtr.observation, fm, fmi.observation, ...limbs, almi.observation],
    adultArgs,
  );
}

/** Build a fully-resolved Performance-Supporting bundle (P1+P3). */
export function performanceReadyBundle(args: {
  sex?: "male" | "female";
  ffmi?: number;
  fmi?: number;
  measuredAt?: string;
  dateOfBirth?: string | null;
  heightCm?: number;
  method?: "dxa" | "consumer_bia";
}): BodyCompositionEvidenceBundle {
  const sex = args.sex ?? "male";
  const heightCm = args.heightCm ?? 180;
  const measuredAt = args.measuredAt ?? "2026-05-01T00:00:00.000Z";
  const method = args.method ?? "dxa";
  const height = heightObservation({ id: "h1", valueCm: heightCm, measuredAt });
  const heightM = heightCm / 100;

  const fmiTarget = args.fmi ?? 5;
  const fatMassKg = fmiTarget * heightM * heightM;
  const fm = dxaFatMass({ id: "fm1", valueKg: fatMassKg, measuredAt, scanRef: "scan_1", method });
  const fmi = calculateFmiObservation({
    fatMassKg,
    heightCm,
    measuredAt,
    inputObservationRefs: ["fm1", "h1"],
  });
  if (!fmi.ok) throw new Error("fmi calc failed");
  fmi.observation = {
    ...fmi.observation,
    provenance: { ...fmi.observation.provenance, scanRef: "scan_1" },
  };

  const ffmiTarget = args.ffmi ?? (sex === "male" ? 19 : 16.5);
  const ffmKg = ffmiTarget * heightM * heightM;
  const ffm = dxaFfm({ id: "ffm1", valueKg: ffmKg, measuredAt, scanRef: "scan_1", method });
  ffm.constructEligibility = [];
  ffm.redundancyGroup = "none";
  const ffmi = calculateFfmiObservation({
    fatFreeMassKg: ffmKg,
    heightCm,
    measuredAt,
    inputObservationRefs: ["ffm1", "h1"],
  });
  if (!ffmi.ok) throw new Error("ffmi calc failed");
  ffmi.observation = {
    ...ffmi.observation,
    provenance: { ...ffmi.observation.provenance, scanRef: "scan_1" },
  };

  ffmi.observation = {
    ...ffmi.observation,
    source: { ...ffmi.observation.source, measurementMethod: "dxa" },
    provenance: { ...ffmi.observation.provenance, scanRef: "scan_1" },
  };

  const adultArgs: {
    sexAtBirth: "male" | "female";
    heightCm: number;
    dateOfBirth?: string | null;
  } = { sexAtBirth: sex, heightCm };
  if (args.dateOfBirth !== undefined) adultArgs.dateOfBirth = args.dateOfBirth;
  return adultBundle([height, fm, fmi.observation, ffm, ffmi.observation], adultArgs);
}

export function scoreHealthFromBundle(bundle: BodyCompositionEvidenceBundle, asOf = AS_OF) {
  const resolution = resolveBodyCompositionEvidence({ bundle, asOf });
  return scoreHealthComposition({ bundle, resolution, asOf });
}

export function scorePerfFromBundle(bundle: BodyCompositionEvidenceBundle, asOf = AS_OF) {
  const resolution = resolveBodyCompositionEvidence({ bundle, asOf });
  return scorePerformanceSupportingComposition({ bundle, resolution, asOf });
}
