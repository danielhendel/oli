/**
 * Bounded scientific + policy-integrity corrections (R1–R4).
 */
import { describe, expect, it } from "@jest/globals";
import type { BodyCompositionEvidenceResolution } from "@oli/contracts";

import {
  calculateAlmiObservation,
  calculateFfmiObservation,
  calculateFmiObservation,
  calculateWhtrObservation,
  ALMI_FORMULA_VERSION,
  FFMI_FORMULA_VERSION,
  FMI_FORMULA_VERSION,
  WHTR_FORMULA_VERSION,
} from "../../formulas";
import { CALCULATED_FORMULA_REGISTRY } from "../formulaProvenance";
import { BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES } from "../policy";
import { resolveBodyCompositionEvidence } from "../resolveBodyCompositionEvidence";
import { SAME_DAY_DXA_PRECEDENCE_ACTIVE_IN_DRAFT_V1 } from "../selection";
import {
  AS_OF,
  baseObservation,
  bundleWith,
  heightObservation,
  unknownProtocolWaist,
  whoWaist,
} from "../testFixtures";

function construct(r: BodyCompositionEvidenceResolution, id: string) {
  return r.constructs.find((c) => c.constructId === id)!;
}

function dxaBf(id: string, measuredAt: string, value = 21.4) {
  return baseObservation({
    observationId: id,
    metricKey: "fat_percent",
    value,
    measuredAt,
    source: {
      sourceSystem: "body_scan",
      measurementMethod: "dxa",
      deviceFamily: null,
      deviceModel: null,
    },
    constructEligibility: ["H2", "P3"],
    redundancyGroup: "bf_fat_mass_fmi",
  });
}

function biaBf(id: string, measuredAt: string, value = 24) {
  return baseObservation({
    observationId: id,
    metricKey: "fat_percent",
    value,
    measuredAt,
    source: {
      sourceSystem: "withings",
      measurementMethod: "consumer_bia",
      deviceFamily: null,
      deviceModel: null,
    },
    constructEligibility: ["H2", "P3"],
    redundancyGroup: "bf_fat_mass_fmi",
    comparabilityGroup: "consumer_bia_composition",
  });
}

describe("R1 — same-day boundary not frozen", () => {
  it("does not activate same-day DXA precedence in draft v1", () => {
    expect(SAME_DAY_DXA_PRECEDENCE_ACTIVE_IN_DRAFT_V1).toBe(false);
  });

  it("CASE A: shared UTC date with different offset-implied local dates → policy_not_frozen", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T02:00:00.000Z"),
        biaBf("bia_bf", "2026-03-04T22:00:00-10:00"), // previous local day in HST; same UTC day
      ]),
      asOf: AS_OF,
    });
    const h2 = construct(r, "H2");
    expect(h2.status).toBe("policy_not_frozen");
    expect(h2.primaryEvidenceRefs.sort()).toEqual(["bia_bf", "dxa_bf"].sort());
    expect(h2.rationaleCodes).toEqual(
      expect.arrayContaining([
        "same_day_boundary_not_frozen",
        "same_day_precedence_not_applied",
        "policy_not_frozen",
      ]),
    );
    expect(h2.rationaleCodes).not.toContain("selected_verified_dxa_same_day_precedence");
  });

  it("CASE B: adjacent UTC dates within 23h → no day-boundary conclusion", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T23:00:00.000Z"),
        biaBf("bia_bf", "2026-03-05T21:00:00.000Z"), // ~22h later
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H2").status).toBe("policy_not_frozen");
    expect(construct(r, "H2").rationaleCodes).toContain("same_day_boundary_not_frozen");
  });

  it("CASE C: 25h apart → still no invented day conclusion for DXA+BIA", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T00:00:00.000Z"),
        biaBf("bia_bf", "2026-03-05T01:00:00.000Z"),
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H2").status).toBe("policy_not_frozen");
  });

  it("CASE D/E: same instant / equal timestamps → no calendar-day DXA precedence", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T12:00:00.000Z"),
        biaBf("bia_bf", "2026-03-04T12:00:00+00:00"),
      ]),
      asOf: AS_OF,
    });
    const h2 = construct(r, "H2");
    expect(h2.status).toBe("policy_not_frozen");
    expect(h2.primaryEvidenceRefs.sort()).toEqual(["bia_bf", "dxa_bf"].sort());
    expect(h2.supportingEvidenceRefs).toEqual([]);
  });

  it("does not select by physiological value when methods differ", () => {
    const lowFavorable = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T08:00:00.000Z", 30),
        biaBf("bia_bf", "2026-03-04T18:00:00.000Z", 12),
      ]),
      asOf: AS_OF,
    });
    const highFavorable = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T08:00:00.000Z", 12),
        biaBf("bia_bf", "2026-03-04T18:00:00.000Z", 30),
      ]),
      asOf: AS_OF,
    });
    expect(construct(lowFavorable, "H2").primaryEvidenceRefs).toEqual(
      construct(highFavorable, "H2").primaryEvidenceRefs,
    );
    expect(construct(lowFavorable, "H2").status).toBe(
      construct(highFavorable, "H2").status,
    );
  });
});

describe("R2 — construct status rollup", () => {
  it("propagates channel multiple_valid / policy_not_frozen to construct", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        dxaBf("dxa_bf", "2026-03-04T08:00:00.000Z"),
        biaBf("bia_bf", "2026-03-04T18:00:00.000Z"),
      ]),
      asOf: AS_OF,
    });
    const h2 = construct(r, "H2");
    const channel = h2.channels.find((c) => c.channelId === "body_fat_percent")!;
    expect(channel.status).toBe("policy_not_frozen");
    expect(h2.status).toBe("policy_not_frozen");
    expect(h2.status).not.toBe("resolved_with_supporting");
    expect(h2.supportingEvidenceRefs).toEqual([]);
    expect(h2.primaryEvidenceRefs.length).toBeGreaterThan(1);
  });

  it("resolved_with_supporting requires frozen primary + governed supporting", () => {
    const height = heightObservation();
    const fm = baseObservation({
      observationId: "fm1",
      metricKey: "fat_mass",
      value: 15,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
    });
    const fmi = calculateFmiObservation({
      fatMassKg: 15,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["fm1", "height1"],
    });
    expect(fmi.ok).toBe(true);
    if (!fmi.ok) return;
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        height,
        fm,
        fmi.observation,
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
      asOf: AS_OF,
    });
    const h2 = construct(r, "H2");
    expect(h2.status).toBe("resolved_with_supporting");
    expect(h2.primaryEvidenceRefs).toEqual([fmi.observation.observationId]);
    expect(h2.supportingEvidenceRefs).toEqual(expect.arrayContaining(["bf1"]));
    expect(h2.channels.find((c) => c.channelId === "fmi")?.status).toBe("resolved");
  });

  it("single resolved channel → resolved", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H2").status).toBe("resolved");
  });

  it("complementary H1 multi-channel → multiple_valid", () => {
    const height = heightObservation();
    const waist = whoWaist({ id: "waist1", valueCm: 80, measuredAt: "2026-05-01T00:00:00.000Z" });
    const whtr = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist1", "height1"],
    });
    expect(whtr.ok).toBe(true);
    if (!whtr.ok) return;
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        height,
        waist,
        whtr.observation,
        baseObservation({
          observationId: "vat_m",
          metricKey: "visceral_fat_mass",
          value: 0.8,
          measuredAt: "2026-04-01T00:00:00.000Z",
          constructEligibility: ["H1"],
          redundancyGroup: "central_adiposity_vat",
          comparabilityGroup: "dxa_vat",
          recencyClass: "slow",
        }),
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H1").status).toBe("multiple_valid");
  });
});

describe("R3 — frozen precedence matrix only", () => {
  it("encodes only frozen pairs (no tertiary Fat Mass / FFM / Lean chains)", () => {
    for (const p of BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES) {
      for (const pair of p.frozenPrecedencePairs) {
        expect(["fmi", "almi"]).toContain(pair.primaryChannelId);
        expect(["body_fat_percent", "ffmi"]).toContain(pair.supportingChannelId);
      }
    }
    const h2 = BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES.find((p) => p.constructId === "H2")!;
    expect(h2.frozenPrecedencePairs).toEqual([
      { primaryChannelId: "fmi", supportingChannelId: "body_fat_percent" },
    ]);
    const h4 = BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES.find((p) => p.constructId === "H4")!;
    expect(h4.frozenPrecedencePairs).toEqual([]);
    expect(h4.complementary).toBe(true);
    const p1 = BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES.find((p) => p.constructId === "P1")!;
    expect(p1.frozenPrecedencePairs).toEqual([]);
  });

  it("BF% + Fat Mass without FMI → policy_not_frozen", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
        baseObservation({
          observationId: "fm1",
          metricKey: "fat_mass",
          value: 15,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H2").status).toBe("policy_not_frozen");
    expect(construct(r, "H2").rationaleCodes).toContain("unfrozen_channel_precedence");
    expect(construct(r, "P3").status).toBe("policy_not_frozen");
  });

  it("FFM + total Lean without ALMI/FFMI → policy_not_frozen for H3", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        baseObservation({
          observationId: "ffm1",
          metricKey: "fat_free_mass",
          value: 60,
          measuredAt: "2026-04-01T00:00:00.000Z",
          constructEligibility: ["H3", "P1"],
          redundancyGroup: "lean_ffm_ffmi",
        }),
        baseObservation({
          observationId: "lean1",
          metricKey: "lean_mass",
          value: 58,
          measuredAt: "2026-04-01T00:00:00.000Z",
          constructEligibility: ["H3", "P1"],
          redundancyGroup: "lean_ffm_ffmi",
        }),
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H3").status).toBe("policy_not_frozen");
    expect(construct(r, "P1").status).toBe("policy_not_frozen");
  });

  it("H4 multi-channel is complementary multiple_valid without ordered A/G chain", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        baseObservation({
          observationId: "ag1",
          metricKey: "android_gynoid_ratio",
          value: 1.1,
          measuredAt: "2026-04-01T00:00:00.000Z",
          canonicalUnit: "ratio",
          constructEligibility: ["H4"],
          recencyClass: "slow",
        }),
        baseObservation({
          observationId: "android_bf",
          metricKey: "fat_percent",
          region: "android",
          value: 30,
          measuredAt: "2026-04-01T00:00:00.000Z",
          constructEligibility: ["H4"],
          recencyClass: "slow",
        }),
      ]),
      asOf: AS_OF,
    });
    expect(construct(r, "H4").status).toBe("multiple_valid");
    expect(construct(r, "H4").rationaleCodes).not.toContain("selected_frozen_channel_precedence");
  });

  it("ALMI over FFMI remains frozen for H3", () => {
    const height = heightObservation();
    const limbs = (["left_arm", "right_arm", "left_leg", "right_leg"] as const).map((region, i) =>
      baseObservation({
        observationId: `limb_${region}`,
        metricKey: "lean_mass",
        region,
        value: 3 + i * 0.1,
        measuredAt: "2026-04-01T00:00:00.000Z",
        constructEligibility: ["P2"],
        redundancyGroup: "appendicular_lean_almi",
        comparabilityGroup: "dxa_regional",
        recencyClass: "slow",
      }),
    );
    const ffm = baseObservation({
      observationId: "ffm1",
      metricKey: "fat_free_mass",
      value: 60,
      measuredAt: "2026-04-01T00:00:00.000Z",
      constructEligibility: ["H3"],
      redundancyGroup: "lean_ffm_ffmi",
    });
    const almi = calculateAlmiObservation({
      appendicularLeanMassKg: 22,
      heightCm: 180,
      measuredAt: "2026-04-01T00:00:00.000Z",
      inputObservationRefs: [...limbs.map((l) => l.observationId), "height1"],
    });
    const ffmi = calculateFfmiObservation({
      fatFreeMassKg: 60,
      heightCm: 180,
      measuredAt: "2026-04-01T00:00:00.000Z",
      inputObservationRefs: ["ffm1", "height1"],
    });
    expect(almi.ok && ffmi.ok).toBe(true);
    if (!almi.ok || !ffmi.ok) return;
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([height, ...limbs, ffm, almi.observation, ffmi.observation]),
      asOf: AS_OF,
    });
    const h3 = construct(r, "H3");
    expect(h3.primaryEvidenceRefs).toEqual([almi.observation.observationId]);
    expect(h3.supportingEvidenceRefs).toContain(ffmi.observation.observationId);
    expect(h3.rationaleCodes).toContain("selected_frozen_channel_precedence");
  });
});

describe("R4 — calculated formula provenance", () => {
  it("registers exact metric→formula versions", () => {
    expect(CALCULATED_FORMULA_REGISTRY.whtr.formulaVersion).toBe(WHTR_FORMULA_VERSION);
    expect(CALCULATED_FORMULA_REGISTRY.fmi.formulaVersion).toBe(FMI_FORMULA_VERSION);
    expect(CALCULATED_FORMULA_REGISTRY.ffmi.formulaVersion).toBe(FFMI_FORMULA_VERSION);
    expect(CALCULATED_FORMULA_REGISTRY.almi.formulaVersion).toBe(ALMI_FORMULA_VERSION);
  });

  it("accepts standardized WHtR with WHO waist + height refs", () => {
    const height = heightObservation();
    const waist = whoWaist({ id: "waist1", valueCm: 80, measuredAt: "2026-05-01T00:00:00.000Z" });
    const whtr = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist1", "height1"],
    });
    expect(whtr.ok).toBe(true);
    if (!whtr.ok) return;
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([height, waist, whtr.observation]),
      asOf: AS_OF,
    });
    expect(construct(r, "H1").status).toBe("resolved");
    expect(construct(r, "H1").primaryEvidenceRefs).toContain(whtr.observation.observationId);
  });

  it("rejects unsupported formula version, dangling height, wrong metric, self-ref", () => {
    const height = heightObservation();
    const waist = whoWaist({ id: "waist1", valueCm: 80, measuredAt: "2026-05-01T00:00:00.000Z" });
    const base = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist1", "height1"],
    });
    expect(base.ok).toBe(true);
    if (!base.ok) return;

    const badVersion = {
      ...base.observation,
      observationId: "whtr_bad_ver",
      provenance: { ...base.observation.provenance, formulaVersion: "whtr_v2" },
    };
    const danglingHeight = {
      ...base.observation,
      observationId: "whtr_dangling",
      provenance: {
        ...base.observation.provenance,
        inputObservationRefs: ["waist1", "missing_height"],
      },
    };
    const selfRef = {
      ...base.observation,
      observationId: "whtr_self",
      provenance: {
        ...base.observation.provenance,
        inputObservationRefs: ["waist1", "whtr_self"],
      },
    };
    const wrongMetric = {
      ...base.observation,
      observationId: "whtr_wrong",
      provenance: {
        ...base.observation.provenance,
        inputObservationRefs: ["waist1", "bf1"],
      },
    };
    const bf = baseObservation({
      observationId: "bf1",
      metricKey: "fat_percent",
      value: 22,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
    });

    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([height, waist, bf, badVersion, danglingHeight, selfRef, wrongMetric]),
      asOf: AS_OF,
    });
    const reasons = r.diagnostics.reasonCounts;
    expect(reasons.excluded_unsupported_formula_version).toBeGreaterThanOrEqual(1);
    expect(reasons.excluded_dangling_input_ref).toBeGreaterThanOrEqual(1);
    expect(reasons.excluded_formula_input_cycle).toBeGreaterThanOrEqual(1);
    expect(reasons.excluded_wrong_formula_input_metric).toBeGreaterThanOrEqual(1);
    expect(construct(r, "H1").status).toBe("insufficient");
  });

  it("rejects unknown-protocol and missing-height WHtR from standardized path", () => {
    const height = heightObservation();
    const unk = unknownProtocolWaist({
      id: "waist_unk",
      valueCm: 80,
      measuredAt: "2026-05-01T00:00:00.000Z",
    });
    const whtrUnk = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist_unk", "height1"],
      observationId: "whtr_unk",
    });
    const who = whoWaist({ id: "waist1", valueCm: 80, measuredAt: "2026-05-01T00:00:00.000Z" });
    const whtrNoHeight = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist1"],
      observationId: "whtr_no_h",
    });
    expect(whtrUnk.ok && whtrNoHeight.ok).toBe(true);
    if (!whtrUnk.ok || !whtrNoHeight.ok) return;
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([height, unk, who, whtrUnk.observation, whtrNoHeight.observation]),
      asOf: AS_OF,
    });
    expect(construct(r, "H1").primaryEvidenceRefs).not.toContain("whtr_unk");
    expect(r.diagnostics.reasonCounts.excluded_missing_height_provenance ?? 0).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("rejects FFMI built from Lean Mass refs", () => {
    const height = heightObservation();
    const lean = baseObservation({
      observationId: "lean1",
      metricKey: "lean_mass",
      value: 58,
      measuredAt: "2026-04-01T00:00:00.000Z",
      constructEligibility: ["H3"],
      redundancyGroup: "lean_ffm_ffmi",
    });
    const fakeFfmi = baseObservation({
      observationId: "ffmi_bad",
      metricKey: "ffmi",
      value: 18,
      measuredAt: "2026-04-01T00:00:00.000Z",
      evidenceType: "calculated",
      sourceReported: false,
      canonicalUnit: "kg_per_m2",
      constructEligibility: ["H3", "P1"],
      redundancyGroup: "lean_ffm_ffmi",
      provenance: {
        sourceFactRef: null,
        sourceEventRef: null,
        scanRef: null,
        sourceDocumentRef: null,
        sourcePage: null,
        adapterId: null,
        adapterVersion: null,
        formulaVersion: FFMI_FORMULA_VERSION,
        inputObservationRefs: ["lean1", "height1"],
        corrected: null,
        protocolId: null,
        protocolVersion: null,
      },
    });
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([height, lean, fakeFfmi]),
      asOf: AS_OF,
    });
    expect(r.diagnostics.reasonCounts.excluded_wrong_formula_input_metric).toBeGreaterThanOrEqual(1);
    expect(construct(r, "H3").primaryEvidenceRefs).toEqual(["lean1"]);
  });

  it("shuffled WHtR input refs remain deterministic", () => {
    const height = heightObservation();
    const waist = whoWaist({ id: "waist1", valueCm: 80, measuredAt: "2026-05-01T00:00:00.000Z" });
    const a = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist1", "height1"],
      observationId: "whtr_a",
    });
    const b = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["height1", "waist1"],
      observationId: "whtr_b",
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const ra = resolveBodyCompositionEvidence({
      bundle: bundleWith([height, waist, a.observation]),
      asOf: AS_OF,
    });
    const rb = resolveBodyCompositionEvidence({
      bundle: bundleWith([a.observation, waist, height].reverse()),
      asOf: AS_OF,
    });
    // Replace with b for second order
    const rc = resolveBodyCompositionEvidence({
      bundle: bundleWith([waist, height, b.observation]),
      asOf: AS_OF,
    });
    expect(construct(ra, "H1").status).toBe(construct(rc, "H1").status);
    expect(construct(ra, "H1").status).toBe("resolved");
    expect(JSON.stringify(construct(rb, "H1").rationaleCodes)).toBe(
      JSON.stringify(construct(ra, "H1").rationaleCodes),
    );
  });
});
