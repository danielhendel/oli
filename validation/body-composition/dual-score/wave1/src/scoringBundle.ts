/**
 * Full BodyCompositionEvidenceBundle builders for Wave 1 (BCV-006/007/015/016/017/031).
 *
 * Follows the construction patterns of lib/data/body/evidence/scoring/testFixtures.ts
 * (healthReadyBundle / performanceReadyBundle) but with the Wave 1 asOf, the Wave 1 DOB
 * convention, and BOTH ALMI and FFMI present for dual-score personas.
 *
 * Calculated indices inherit the effective date of their governing source:
 *   WHtR  → Waist measuredAt;  FMI / FFMI / ALMI → DXA measuredAt.
 * Imports ONLY approved resolver / formula helpers and the score engines (read-only).
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceResolution,
  BodyCompositionHealthScoreResult,
  BodyCompositionPerformanceSupportingScoreResult,
} from "@oli/contracts";
import {
  calculateAlmiObservation,
  calculateBmiObservation,
  calculateFfmiObservation,
  calculateFmiObservation,
  calculateWhtrObservation,
} from "@oli/lib/data/body/evidence/formulas";
import { resolveBodyCompositionEvidence } from "@oli/lib/data/body/evidence/resolver/resolveBodyCompositionEvidence";
import {
  baseObservation,
  bundleWith,
  heightObservation,
  whoWaist,
} from "@oli/lib/data/body/evidence/resolver/testFixtures";
import { scoreHealthComposition } from "@oli/lib/data/body/evidence/scoring/scoreHealthComposition";
import { scorePerformanceSupportingComposition } from "@oli/lib/data/body/evidence/scoring/scorePerformanceSupportingComposition";

import { AS_OF } from "./constants";
import type { Sex } from "./constants";
import { dobForCompletedAge } from "./identity";

export type BundleSpec = {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  whtr: number;
  fmi: number;
  almi: number;
  ffmi: number;
  /** Default AS_OF. */
  waistAt?: string;
  heightAt?: string;
  dxaAt?: string;
  /** DXA constructs share this scanRef (era gap = 0 for scanRef-equal pairs). Default "scan_1". */
  dxaScanRef?: string | null;
  waistSourceEventRef?: string | null;
  dxaSourceEventRef?: string | null;
  includeAlmi?: boolean; // default true
  includeFfmi?: boolean; // default true
  dxaMethod?: "dxa" | "consumer_bia";
  /** Override subject context (fixtures) */
  dateOfBirthOverride?: string | null;
  sexOverride?: "male" | "female" | "intersex" | "unspecified" | null;
  heightContextOverride?: number | null;
  /**
   * One Height observation PER calculated index (h_whtr / h_fmi / h_almi / h_ffmi) so a
   * fixture can remove Height for exactly one construct (BCV-015). Default false (single "h1").
   */
  perIndexHeight?: boolean;
  /** Metadata-only BMI proxy (BCV-031). */
  bmiProxy?: number | null;
  /** Device labels (BCV-031 vendor/site hidden-path probe). */
  deviceFamily?: string | null;
  deviceModel?: string | null;
};

function setProv(
  obs: BodyCompositionEvidenceObservation,
  patch: Partial<BodyCompositionEvidenceObservation["provenance"]>,
): BodyCompositionEvidenceObservation {
  return { ...obs, provenance: { ...obs.provenance, ...patch } };
}

/** Standard observation ids used by every Wave 1 bundle. */
export const OBS_IDS = {
  height: "h1",
  waist: "w1",
  whtr: "whtr1",
  fm: "fm1",
  fmi: "fmi1",
  ffm: "ffm1",
  ffmi: "ffmi1",
  almi: "almi1",
  limbs: ["arm_l", "arm_r", "leg_l", "leg_r"] as const,
  bodyMass: "bm1",
  bmi: "bmi1",
} as const;

export const PER_INDEX_HEIGHT_IDS = {
  whtr: "h_whtr",
  fmi: "h_fmi",
  almi: "h_almi",
  ffmi: "h_ffmi",
} as const;

export function buildBundle(spec: BundleSpec): BodyCompositionEvidenceBundle {
  const asOf = AS_OF;
  const waistAt = spec.waistAt ?? asOf;
  const heightAt = spec.heightAt ?? asOf;
  const dxaAt = spec.dxaAt ?? asOf;
  const scanRef = spec.dxaScanRef === undefined ? "scan_1" : spec.dxaScanRef;
  const method = spec.dxaMethod ?? "dxa";
  const hCm = spec.heightCm;
  const hm = hCm / 100;
  const hm2 = hm * hm;
  const observations: BodyCompositionEvidenceObservation[] = [];

  // --- H1 inputs ---
  const per = spec.perIndexHeight === true;
  const hid = (k: keyof typeof PER_INDEX_HEIGHT_IDS): string =>
    per ? PER_INDEX_HEIGHT_IDS[k] : OBS_IDS.height;
  const heightObs = (k: keyof typeof PER_INDEX_HEIGHT_IDS) =>
    heightObservation({ id: hid(k), valueCm: hCm, measuredAt: heightAt });
  const waistCm = spec.whtr * hCm;
  let waist = whoWaist({ id: OBS_IDS.waist, valueCm: waistCm, measuredAt: waistAt });
  if (spec.waistSourceEventRef !== undefined) {
    waist = setProv(waist, { sourceEventRef: spec.waistSourceEventRef });
  }
  const whtr = calculateWhtrObservation({
    waistCm,
    heightCm: hCm,
    measuredAt: waistAt,
    inputObservationRefs: [OBS_IDS.waist, hid("whtr")],
    observationId: OBS_IDS.whtr,
  });
  if (!whtr.ok) throw new Error("whtr_calc_failed");
  observations.push(heightObs("whtr"), waist, whtr.observation);

  // --- DXA: fat mass / FMI ---
  const fmKg = spec.fmi * hm2;
  let fm = baseObservation({
    observationId: OBS_IDS.fm,
    metricKey: "fat_mass",
    value: fmKg,
    measuredAt: dxaAt,
    constructEligibility: ["H2", "P3"],
    redundancyGroup: "bf_fat_mass_fmi",
    source: {
      sourceSystem: "body_scan",
      measurementMethod: method,
      deviceFamily: spec.deviceFamily ?? null,
      deviceModel: spec.deviceModel ?? null,
    },
    provenance: provenanceStub(scanRef),
  });
  if (spec.dxaSourceEventRef !== undefined) fm = setProv(fm, { sourceEventRef: spec.dxaSourceEventRef });
  const fmi = calculateFmiObservation({
    fatMassKg: fmKg,
    heightCm: hCm,
    measuredAt: dxaAt,
    inputObservationRefs: [OBS_IDS.fm, hid("fmi")],
    observationId: OBS_IDS.fmi,
  });
  if (!fmi.ok) throw new Error("fmi_calc_failed");
  if (per) observations.push(heightObs("fmi"));
  let fmiObs: BodyCompositionEvidenceObservation = setProv(fmi.observation, { scanRef });
  fmiObs = { ...fmiObs, source: { ...fmiObs.source, measurementMethod: method === "dxa" ? "other" : method } };
  if (spec.dxaSourceEventRef !== undefined) fmiObs = setProv(fmiObs, { sourceEventRef: spec.dxaSourceEventRef });
  observations.push(fm, fmiObs);

  // --- DXA: ALMI via limb lean ---
  if (spec.includeAlmi !== false) {
    const almKg = spec.almi * hm2;
    const each = almKg / 4;
    const limbs: BodyCompositionEvidenceObservation[] = (
      [
        [OBS_IDS.limbs[0], "left_arm"],
        [OBS_IDS.limbs[1], "right_arm"],
        [OBS_IDS.limbs[2], "left_leg"],
        [OBS_IDS.limbs[3], "right_leg"],
      ] as const
    ).map(([id, region]) => {
      let o = baseObservation({
        observationId: id,
        metricKey: "lean_mass",
        region,
        value: each,
        measuredAt: dxaAt,
        constructEligibility: ["P2"],
        redundancyGroup: "appendicular_lean_almi",
        source: {
          sourceSystem: "body_scan",
          measurementMethod: method,
          deviceFamily: spec.deviceFamily ?? null,
          deviceModel: spec.deviceModel ?? null,
        },
        provenance: provenanceStub(scanRef),
      });
      if (spec.dxaSourceEventRef !== undefined) o = setProv(o, { sourceEventRef: spec.dxaSourceEventRef });
      return o;
    });
    const almi = calculateAlmiObservation({
      appendicularLeanMassKg: almKg,
      heightCm: hCm,
      measuredAt: dxaAt,
      inputObservationRefs: [...limbs.map((l) => l.observationId), hid("almi")],
      observationId: OBS_IDS.almi,
    });
    if (!almi.ok) throw new Error("almi_calc_failed");
    if (per) observations.push(heightObs("almi"));
    let almiObs = setProv(almi.observation, { scanRef });
    if (method !== "dxa") almiObs = { ...almiObs, source: { ...almiObs.source, measurementMethod: method } };
    if (spec.dxaSourceEventRef !== undefined) almiObs = setProv(almiObs, { sourceEventRef: spec.dxaSourceEventRef });
    observations.push(...limbs, almiObs);
  }

  // --- DXA: FFM / FFMI ---
  if (spec.includeFfmi !== false) {
    const ffmKg = spec.ffmi * hm2;
    let ffm = baseObservation({
      observationId: OBS_IDS.ffm,
      metricKey: "fat_free_mass",
      value: ffmKg,
      measuredAt: dxaAt,
      constructEligibility: [],
      redundancyGroup: "none",
      source: {
        sourceSystem: "body_scan",
        measurementMethod: method,
        deviceFamily: spec.deviceFamily ?? null,
        deviceModel: spec.deviceModel ?? null,
      },
      provenance: provenanceStub(scanRef),
    });
    if (spec.dxaSourceEventRef !== undefined) ffm = setProv(ffm, { sourceEventRef: spec.dxaSourceEventRef });
    const ffmi = calculateFfmiObservation({
      fatFreeMassKg: ffmKg,
      heightCm: hCm,
      measuredAt: dxaAt,
      inputObservationRefs: [OBS_IDS.ffm, hid("ffmi")],
      observationId: OBS_IDS.ffmi,
    });
    if (!ffmi.ok) throw new Error("ffmi_calc_failed");
    if (per) observations.push(heightObs("ffmi"));
    let ffmiObs = setProv(ffmi.observation, { scanRef });
    ffmiObs = { ...ffmiObs, source: { ...ffmiObs.source, measurementMethod: method } };
    if (spec.dxaSourceEventRef !== undefined) ffmiObs = setProv(ffmiObs, { sourceEventRef: spec.dxaSourceEventRef });
    observations.push(ffm, ffmiObs);
  }

  // --- Metadata-only BMI proxy (never a scoring input) ---
  if (spec.bmiProxy != null) {
    const bodyMassKg = spec.bmiProxy * hm2;
    const bm = baseObservation({
      observationId: OBS_IDS.bodyMass,
      metricKey: "body_mass",
      value: bodyMassKg,
      measuredAt: dxaAt,
      source: {
        sourceSystem: "manual",
        measurementMethod: "manual_anthropometry",
        deviceFamily: null,
        deviceModel: null,
      },
    });
    const bmi = calculateBmiObservation({
      bodyMassKg,
      heightCm: hCm,
      measuredAt: dxaAt,
      inputObservationRefs: [OBS_IDS.bodyMass, hid("whtr")],
      observationId: OBS_IDS.bmi,
    });
    if (!bmi.ok) throw new Error("bmi_calc_failed");
    observations.push(bm, bmi.observation);
  }

  const base = bundleWith(observations);
  const heightContext =
    spec.heightContextOverride === undefined ? hCm : spec.heightContextOverride;
  return {
    ...base,
    subjectContext: {
      ...base.subjectContext,
      sexAtBirth: spec.sexOverride === undefined ? spec.sex : spec.sexOverride,
      dateOfBirth:
        spec.dateOfBirthOverride === undefined
          ? dobForCompletedAge(spec.ageYears)
          : spec.dateOfBirthOverride,
      height: {
        valueCm: heightContext,
        effectiveAt: heightContext != null ? "2020-01-01T00:00:00.000Z" : null,
        sourceSystem: heightContext != null ? "manual" : null,
      },
    },
  };
}

function provenanceStub(scanRef: string | null) {
  return {
    sourceFactRef: null,
    sourceEventRef: null,
    scanRef,
    sourceDocumentRef: null,
    sourcePage: null,
    adapterId: null,
    adapterVersion: null,
    formulaVersion: null,
    inputObservationRefs: null,
    corrected: null,
    protocolId: null,
    protocolVersion: null,
  };
}

export type FullScore = {
  resolution: BodyCompositionEvidenceResolution;
  health: BodyCompositionHealthScoreResult;
  performance: BodyCompositionPerformanceSupportingScoreResult;
  /** True when P1 was normalized from the natural `policy_not_frozen` (see normalizeP1Resolution). */
  p1Normalized: boolean;
  /** Natural Resolver status of P1 before any normalization. */
  p1NaturalStatus: string | null;
};

const RESOLVED_STATUSES = new Set<string>(["resolved", "resolved_with_supporting"]);

/**
 * KNOWN RESOLVER BEHAVIOUR (reported as a finding, not "fixed"): whenever an FFMI observation and the
 * FFM observation it was calculated from are both in the bundle, the approved Resolver reports P1 as
 * `policy_not_frozen` (unfrozen FFMI-vs-FFM channel precedence), so Performance-Supporting is
 * unavailable for every realistic bundle. Wave 1 structural/fairness protocols need a *scoring*
 * baseline, so P1 is normalized to `resolved` on the governed FFMI channel — ONLY when P1 is
 * `policy_not_frozen` and the FFMI channel itself is resolved. Always recorded (`p1Normalized`).
 */
export function normalizeP1Resolution(r: BodyCompositionEvidenceResolution): {
  resolution: BodyCompositionEvidenceResolution;
  normalized: boolean;
  naturalStatus: string | null;
} {
  const c = r.constructs.find((x) => x.constructId === "P1");
  if (!c) return { resolution: r, normalized: false, naturalStatus: null };
  if (c.status !== "policy_not_frozen") return { resolution: r, normalized: false, naturalStatus: c.status };
  const ffmi = c.channels.find((ch) => ch.channelId === "ffmi");
  const ref = ffmi?.primaryEvidenceRefs[0];
  if (!ffmi || !RESOLVED_STATUSES.has(ffmi.status) || !ref) {
    return { resolution: r, normalized: false, naturalStatus: c.status };
  }
  return {
    resolution: {
      ...r,
      constructs: r.constructs.map((x) =>
        x.constructId === "P1"
          ? {
              ...x,
              status: "resolved" as const,
              primaryEvidenceRefs: [ref],
              supportingEvidenceRefs: x.primaryEvidenceRefs.filter((q) => q !== ref),
            }
          : x,
      ),
    },
    normalized: true,
    naturalStatus: c.status,
  };
}

/** Resolve once, then score Health + Performance-Supporting with the approved engines. */
export function resolveAndScore(
  bundle: BodyCompositionEvidenceBundle,
  opts: {
    asOf?: string;
    patchResolution?: (r: BodyCompositionEvidenceResolution) => BodyCompositionEvidenceResolution;
    /** Apply normalizeP1Resolution (default false; structural protocols pass true). */
    normalizeP1?: boolean;
  } = {},
): FullScore {
  const asOf = opts.asOf ?? AS_OF;
  let resolution = resolveBodyCompositionEvidence({ bundle, asOf });
  let p1Normalized = false;
  const p1 = resolution.constructs.find((x) => x.constructId === "P1");
  const p1NaturalStatus = p1 ? p1.status : null;
  if (opts.normalizeP1) {
    const n = normalizeP1Resolution(resolution);
    resolution = n.resolution;
    p1Normalized = n.normalized;
  }
  if (opts.patchResolution) resolution = opts.patchResolution(resolution);
  const health = scoreHealthComposition({ bundle, resolution, asOf });
  const performance = scorePerformanceSupportingComposition({ bundle, resolution, asOf });
  return { resolution, health, performance, p1Normalized, p1NaturalStatus };
}

/** Spec from a persona-like index row (table WHtR is canonical for engine bundles). */
export function specFromIndices(args: {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  whtr: number;
  fmi: number;
  almi: number;
  ffmi: number;
}): BundleSpec {
  return { ...args };
}
