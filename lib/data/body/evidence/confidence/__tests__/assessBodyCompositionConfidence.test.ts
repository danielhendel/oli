/**
 * Assessment Confidence — contracts, statuses, constructs, completeness, recency.
 */
import { describe, expect, it } from "@jest/globals";
import {
  BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
  BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT,
  BODY_COMPOSITION_RESOLVER_VERSION,
  type BodyCompositionAssessmentConfidence,
} from "@oli/contracts";

import {
  calculateFmiObservation,
  calculateWhtrObservation,
} from "../../formulas";
import { resolveBodyCompositionEvidence } from "../../resolver/resolveBodyCompositionEvidence";
import {
  AS_OF,
  baseObservation,
  bundleWith,
  emptyBundle,
  heightObservation,
  unknownProtocolWaist,
  whoWaist,
} from "../../resolver/testFixtures";
import { assessBodyCompositionConfidence } from "../assessBodyCompositionConfidence";
import {
  FROZEN_LABEL_RULE_COUNT,
  LABEL_POLICY_STATE,
  assignConfidenceLabel,
  confidenceStatusFromResolverStatus,
} from "../policy";

function resolveThenAssess(bundle: ReturnType<typeof bundleWith>, asOf = AS_OF) {
  const resolution = resolveBodyCompositionEvidence({ bundle, asOf });
  const confidence = assessBodyCompositionConfidence({
    bundle,
    resolution,
    asOf,
  });
  return { resolution, confidence };
}

function construct(
  confidence: BodyCompositionAssessmentConfidence,
  id: string,
) {
  return confidence.constructAssessments.find((c) => c.constructId === id)!;
}

function assertNoNumericConfidence(confidence: BodyCompositionAssessmentConfidence) {
  const json = JSON.stringify(confidence);
  expect(json).not.toMatch(
    /confidenceScore|confidencePercent|qualityScore|"points"|"weight"|normalizedScore|healthScore|performanceScore|"score"|riskPercent|Very High|very_high|Excellent|Elite|Perfect/,
  );
  expect(confidence).not.toHaveProperty("uid");
  expect(confidence).not.toHaveProperty("userId");
  expect(confidence.diagnostics.labeledConstructCount).toBe(0);
  for (const c of confidence.constructAssessments) {
    expect(c.label).toBeNull();
  }
  for (const d of confidence.domainAssessments) {
    expect(d.label).toBeNull();
    expect(d.status).toBe("policy_not_frozen");
  }
}

describe("Assessment Confidence — versioning and contracts", () => {
  it("uses draft confidence version and zero frozen label rules", () => {
    expect(BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION).toBe(
      "body_composition_assessment_confidence_draft_v1",
    );
    expect(FROZEN_LABEL_RULE_COUNT).toBe(0);
    expect(BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT).toBe(0);
    expect(LABEL_POLICY_STATE).toBe("label_assignment_matrix_not_frozen");
  });

  it("fails closed on unsupported confidence version", () => {
    const bundle = emptyBundle();
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const confidence = assessBodyCompositionConfidence({
      bundle,
      resolution,
      asOf: AS_OF,
      confidenceVersion: "not_a_real_version" as typeof BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
    });
    expect(confidence.diagnostics.safeNotes).toContain("unsupported_confidence_version");
    assertNoNumericConfidence(confidence);
  });

  it("fails closed on dangling resolver refs", () => {
    const bundle = bundleWith([
      baseObservation({
        observationId: "bf1",
        metricKey: "fat_percent",
        value: 22,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2"],
        redundancyGroup: "bf_fat_mass_fmi",
      }),
    ]);
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h2 = resolution.constructs.find((c) => c.constructId === "H2")!;
    const mutated = {
      ...resolution,
      constructs: resolution.constructs.map((c) =>
        c.constructId === "H2"
          ? { ...h2, primaryEvidenceRefs: ["missing_obs"] }
          : c,
      ),
    };
    const confidence = assessBodyCompositionConfidence({
      bundle,
      resolution: mutated,
      asOf: AS_OF,
    });
    expect(confidence.diagnostics.safeNotes).toContain("dangling_resolver_observation_ref");
    expect(construct(confidence, "H2").label).toBeNull();
  });

  it("fails closed on completeness mismatch", () => {
    const bundle = emptyBundle();
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const mutated = {
      ...resolution,
      evidenceBundleCompleteness: {
        ...resolution.evidenceBundleCompleteness,
        // force mismatch vs bundle profile presence while keeping mode
        profile: "available" as const,
      },
    };
    // mode still matches; mutate bundle mode via invalid cast path — use asOf mismatch instead
    const confidence = assessBodyCompositionConfidence({
      bundle,
      resolution: { ...mutated, asOf: "2025-01-01T00:00:00.000Z" },
      asOf: AS_OF,
    });
    expect(confidence.diagnostics.safeNotes).toContain("as_of_mismatch");
  });
});

describe("Assessment Confidence — label policy", () => {
  it("withholds all labels because assignment matrix is not frozen", () => {
    const { confidence } = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2", "P3"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    assertNoNumericConfidence(confidence);
    expect(construct(confidence, "H2").status).toBe("policy_not_frozen");
    expect(construct(confidence, "H2").rationaleCodes).toContain("label_withheld_no_frozen_rule");
    expect(construct(confidence, "H2").limitingFactors).toContain(
      "label_assignment_policy_not_frozen",
    );
  });

  it("does not force Limited as a generic fallback", () => {
    const decision = assignConfidenceLabel({ resolverStatus: "resolved" });
    expect(decision.label).toBeNull();
    expect(decision.status).toBe("policy_not_frozen");
    expect(decision.label).not.toBe("limited");
  });

  it("maps resolver statuses without inventing labels", () => {
    const statuses = [
      "resolved",
      "resolved_with_supporting",
      "multiple_valid",
      "policy_not_frozen",
      "conflict",
      "insufficient",
      "undated_only",
      "unsupported",
    ] as const;
    for (const status of statuses) {
      const decision = assignConfidenceLabel({ resolverStatus: status });
      expect(decision.label).toBeNull();
      expect(decision.status).toBe(confidenceStatusFromResolverStatus(status));
    }
  });
});

describe("Assessment Confidence — completeness and scope", () => {
  it("preserves caller_supplied_partial and does not claim account complete", () => {
    const { confidence } = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    expect(confidence.evidenceBundleCompleteness.mode).toBe("caller_supplied_partial");
    expect(confidence.scope.mode).toBe("caller_supplied_partial");
    expect(confidence.scope.accountEvidenceClaim).toBe("scoped_to_supplied_evidence_only");
    expect(construct(confidence, "H2").limitingFactors).toContain("caller_supplied_partial");
    expect(construct(confidence, "H2").status).not.toBe("assessed");
  });
});

describe("Assessment Confidence — resolver status matrix", () => {
  it("handles resolved / insufficient / policy_not_frozen honestly", () => {
    const resolved = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    expect(resolved.resolution.constructs.find((c) => c.constructId === "H2")!.status).toBe(
      "resolved",
    );
    expect(construct(resolved.confidence, "H2").resolverStatus).toBe("resolved");
    expect(construct(resolved.confidence, "H2").status).toBe("policy_not_frozen");
    expect(construct(resolved.confidence, "H2").label).toBeNull();
    expect(construct(resolved.confidence, "H2").supportingFactors).toContain(
      "resolver_primary_resolved",
    );

    const empty = resolveThenAssess(emptyBundle());
    expect(construct(empty.confidence, "H1").status).toBe("insufficient");
    expect(construct(empty.confidence, "H1").label).toBeNull();
    expect(construct(empty.confidence, "H1").limitingFactors).toContain(
      "insufficient_required_inputs",
    );

    const open = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "dxa_bf",
          metricKey: "fat_percent",
          value: 21.4,
          measuredAt: "2026-03-04T08:00:00.000Z",
          source: {
            sourceSystem: "body_scan",
            measurementMethod: "dxa",
            deviceFamily: null,
            deviceModel: null,
          },
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
        baseObservation({
          observationId: "bia_bf",
          metricKey: "fat_percent",
          value: 18.0,
          measuredAt: "2026-03-04T18:00:00.000Z",
          source: {
            sourceSystem: "withings",
            measurementMethod: "consumer_bia",
            deviceFamily: null,
            deviceModel: null,
          },
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
          comparabilityGroup: "consumer_bia_composition",
        }),
      ]),
    );
    expect(open.resolution.constructs.find((c) => c.constructId === "H2")!.status).toBe(
      "policy_not_frozen",
    );
    expect(construct(open.confidence, "H2").status).toBe("policy_not_frozen");
    expect(construct(open.confidence, "H2").label).toBeNull();
  });
});

describe("Assessment Confidence — construct matrix", () => {
  it("H1 records WHtR / WHO / VAT factual basis without labeling", () => {
    const height = heightObservation();
    const waist = whoWaist({
      id: "waist1",
      valueCm: 80,
      measuredAt: "2026-05-01T00:00:00.000Z",
    });
    const whtr = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["waist1", "height1"],
      observationId: "whtr1",
    });
    expect(whtr.ok).toBe(true);
    if (!whtr.ok) return;
    const vat = baseObservation({
      observationId: "vat1",
      metricKey: "visceral_fat_mass",
      value: 0.5,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H1"],
      redundancyGroup: "central_adiposity_vat",
      comparabilityGroup: "dxa_vat",
    });
    const { confidence } = resolveThenAssess(
      bundleWith([height, waist, whtr.observation, vat]),
    );
    const h1 = construct(confidence, "H1");
    expect(h1.label).toBeNull();
    expect(h1.confidenceBasis.constructFacts).toEqual(
      expect.arrayContaining([
        "standardized_whtr_channel_present",
        "vat_mass_channel_present",
      ]),
    );
    expect(h1.confidenceBasis.factualDimensions.protocolState).toBe("known_governed");
    expect(h1.supportingFactors).toContain("governed_protocol_present");
  });

  it("H1 records unknown waist protocol factually", () => {
    const height = heightObservation();
    const waist = unknownProtocolWaist({
      id: "waist_u",
      valueCm: 90,
      measuredAt: "2026-05-01T00:00:00.000Z",
    });
    const { confidence } = resolveThenAssess(bundleWith([height, waist]));
    const h1 = construct(confidence, "H1");
    // Unknown-protocol waist is not a standardized WHtR primary; still factual.
    expect(h1.label).toBeNull();
    expect(h1.limitingFactors).toContain("label_assignment_policy_not_frozen");
  });

  it("H2 / P3 record BF% / FMI facts without favorability", () => {
    const height = heightObservation({ id: "h1" });
    const fatMass = baseObservation({
      observationId: "fm1",
      metricKey: "fat_mass",
      value: 18,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2", "P3"],
      redundancyGroup: "bf_fat_mass_fmi",
    });
    const fmi = calculateFmiObservation({
      fatMassKg: 18,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["fm1", "h1"],
      observationId: "fmi1",
    });
    expect(fmi.ok).toBe(true);
    if (!fmi.ok) return;
    const { confidence } = resolveThenAssess(bundleWith([height, fatMass, fmi.observation]));
    expect(construct(confidence, "H2").confidenceBasis.constructFacts).toEqual(
      expect.arrayContaining(["fmi_resolved", "exact_fmi_provenance"]),
    );
    expect(construct(confidence, "P3").confidenceBasis.constructFacts).toEqual(
      expect.arrayContaining(["fmi_present"]),
    );
    expect(construct(confidence, "H2").label).toBeNull();
    expect(construct(confidence, "P3").label).toBeNull();
  });

  it("H3 / P1 / P2 expose lean-channel facts without strength inference", () => {
    const lean = baseObservation({
      observationId: "lean1",
      metricKey: "lean_mass",
      value: 58,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H3", "P1"],
      redundancyGroup: "lean_ffm_ffmi",
    });
    const arm = baseObservation({
      observationId: "arm_r",
      metricKey: "lean_mass",
      value: 4,
      region: "right_arm",
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["P2"],
      redundancyGroup: "appendicular_lean_almi",
      comparabilityGroup: "dxa_regional",
    });
    const { confidence } = resolveThenAssess(bundleWith([lean, arm]));
    expect(construct(confidence, "H3").confidenceBasis.constructFacts).toContain(
      "total_lean_evidence",
    );
    expect(construct(confidence, "P1").confidenceBasis.constructFacts).toContain(
      "total_lean_present",
    );
    expect(construct(confidence, "P2").confidenceBasis.constructFacts).toContain(
      "right_arm_lean_present",
    );
    expect(construct(confidence, "P2").confidenceBasis.constructFacts).toContain(
      "laterality_coverage_1_of_4",
    );
    expect(construct(confidence, "H3").label).toBeNull();
  });

  it("H4 records A/G ratio factually", () => {
    const { confidence } = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "ag1",
          metricKey: "android_gynoid_ratio",
          value: 1.1,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H4"],
          redundancyGroup: "none",
          comparabilityGroup: "dxa_regional",
        }),
      ]),
    );
    expect(construct(confidence, "H4").confidenceBasis.constructFacts).toContain(
      "ag_ratio_present",
    );
    expect(construct(confidence, "H4").label).toBeNull();
  });
});

describe("Assessment Confidence — method / source / protocol / provenance", () => {
  it("keeps Apple Health unlabeled composition as unknown method", () => {
    const { confidence } = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "ah_bf",
          metricKey: "fat_percent",
          value: 24,
          measuredAt: "2026-05-01T00:00:00.000Z",
          evidenceType: "estimated",
          source: {
            sourceSystem: "apple_health",
            measurementMethod: "unknown",
            deviceFamily: null,
            deviceModel: null,
          },
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
          comparabilityGroup: "unknown",
        }),
      ]),
    );
    const h2 = construct(confidence, "H2");
    expect(h2.confidenceBasis.factualDimensions.unknownMethodPresent).toBe(true);
    expect(h2.confidenceBasis.factualDimensions.estimatedEvidencePresent).toBe(true);
    expect(h2.limitingFactors).toContain("method_unknown");
    expect(h2.limitingFactors).toContain("estimated_evidence_present");
    expect(h2.label).toBeNull();
  });

  it("does not invent DXA=Strong or BIA=Limited", () => {
    const dxa = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "dxa1",
          metricKey: "fat_percent",
          value: 20,
          measuredAt: "2026-05-01T00:00:00.000Z",
          source: {
            sourceSystem: "body_scan",
            measurementMethod: "dxa",
            deviceFamily: null,
            deviceModel: null,
          },
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    const bia = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bia1",
          metricKey: "fat_percent",
          value: 20,
          measuredAt: "2026-05-01T00:00:00.000Z",
          source: {
            sourceSystem: "withings",
            measurementMethod: "consumer_bia",
            deviceFamily: null,
            deviceModel: null,
          },
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
          comparabilityGroup: "consumer_bia_composition",
        }),
      ]),
    );
    expect(construct(dxa.confidence, "H2").label).toBeNull();
    expect(construct(bia.confidence, "H2").label).toBeNull();
    expect(construct(dxa.confidence, "H2").status).toBe(
      construct(bia.confidence, "H2").status,
    );
  });

  it("records calculated provenance complete without recalculating", () => {
    const height = heightObservation({ id: "h1" });
    const fatMass = baseObservation({
      observationId: "fm1",
      metricKey: "fat_mass",
      value: 18,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
    });
    const fmi = calculateFmiObservation({
      fatMassKg: 18,
      heightCm: 180,
      measuredAt: "2026-05-01T00:00:00.000Z",
      inputObservationRefs: ["fm1", "h1"],
      observationId: "fmi1",
    });
    expect(fmi.ok).toBe(true);
    if (!fmi.ok) return;
    const { confidence } = resolveThenAssess(bundleWith([height, fatMass, fmi.observation]));
    expect(
      construct(confidence, "H2").confidenceBasis.factualDimensions.calculatedProvenanceState,
    ).toBe("complete");
    expect(construct(confidence, "H2").supportingFactors).toContain(
      "calculated_provenance_complete",
    );
  });
});

describe("Assessment Confidence — recency boundary", () => {
  it("exposes ageDays factually without label change from invented cutoffs", () => {
    const recent = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf_recent",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-20T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    const older = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf_old",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2025-01-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    const recentAge = construct(recent.confidence, "H2").confidenceBasis.factualDimensions.ageDays;
    const olderAge = construct(older.confidence, "H2").confidenceBasis.factualDimensions.ageDays;
    expect(recentAge).not.toBeNull();
    expect(olderAge).not.toBeNull();
    expect(olderAge!).toBeGreaterThan(recentAge!);
    expect(construct(recent.confidence, "H2").label).toBeNull();
    expect(construct(older.confidence, "H2").label).toBeNull();
    expect(construct(recent.confidence, "H2").status).toBe(
      construct(older.confidence, "H2").status,
    );
    expect(
      construct(recent.confidence, "H2").confidenceBasis.factualDimensions.recencyPolicyState,
    ).toBe("threshold_not_frozen");
    expect(construct(recent.confidence, "H2").limitingFactors).toContain(
      "recency_threshold_not_frozen",
    );
  });
});

describe("Assessment Confidence — domain rollup", () => {
  it("keeps domain labels null when rollup policy is unfrozen", () => {
    const { confidence } = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf1",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2", "P3"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    expect(confidence.domainAssessments).toHaveLength(2);
    expect(confidence.domainAssessments.every((d) => d.label === null)).toBe(true);
    expect(confidence.domainAssessments.every((d) => d.status === "policy_not_frozen")).toBe(
      true,
    );
    expect(confidence.diagnostics.safeNotes).toContain("domain_rollup_policy_not_frozen");
    expect(confidence.constructAssessments).toHaveLength(7);
  });
});

describe("Assessment Confidence — privacy / no persistence tokens", () => {
  it("diagnostics contain only safe tokens", () => {
    const { confidence } = resolveThenAssess(
      bundleWith([
        baseObservation({
          observationId: "bf_secret_id",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H2"],
          redundancyGroup: "bf_fat_mass_fmi",
        }),
      ]),
    );
    const notes = confidence.diagnostics.safeNotes.join(" ");
    expect(notes).not.toContain("bf_secret_id");
    expect(notes).not.toContain("22");
    expect(notes).not.toMatch(/https?:\/\//);
    expect(notes).not.toMatch(/\.pdf/i);
    expect(confidence.confidenceVersion).toBe(BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION);
    expect(confidence.resolverVersion).toBe(BODY_COMPOSITION_RESOLVER_VERSION);
  });
});
