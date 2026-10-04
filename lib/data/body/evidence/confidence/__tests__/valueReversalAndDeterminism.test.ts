/**
 * Value-reversal + determinism + duplicate invariance for Assessment Confidence.
 */
import { describe, expect, it } from "@jest/globals";
import type { BodyCompositionAssessmentConfidence } from "@oli/contracts";

import { resolveBodyCompositionEvidence } from "../../resolver/resolveBodyCompositionEvidence";
import { AS_OF, baseObservation, bundleWith } from "../../resolver/testFixtures";
import { assessBodyCompositionConfidence } from "../assessBodyCompositionConfidence";

function assessFor(observations: Parameters<typeof bundleWith>[0]) {
  const bundle = bundleWith(observations);
  const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
  return assessBodyCompositionConfidence({ bundle, resolution, asOf: AS_OF });
}

/** Strip nothing — full structural compare of confidence-relevant fields. */
function confidenceSignature(c: BodyCompositionAssessmentConfidence) {
  return JSON.stringify({
    version: c.confidenceVersion,
    scope: c.scope,
    constructs: c.constructAssessments.map((a) => ({
      id: a.constructId,
      status: a.status,
      label: a.label,
      resolverStatus: a.resolverStatus,
      dims: {
        ...a.confidenceBasis.factualDimensions,
        // ageDays may differ across fixtures intentionally; keep when present
      },
      facts: a.confidenceBasis.constructFacts,
      supporting: a.supportingFactors,
      limiting: a.limitingFactors,
      rationale: a.rationaleCodes,
      primary: a.primaryEvidenceRefs,
      supportingRefs: a.supportingEvidenceRefs,
      alternate: a.alternateEvidenceRefs,
    })),
    domains: c.domainAssessments,
    labeled: c.diagnostics.labeledConstructCount,
  });
}

describe("Assessment Confidence — value reversal", () => {
  it("identical provenance with opposite BF% yields identical Confidence", () => {
    const low = assessFor([
      baseObservation({
        observationId: "bf1",
        metricKey: "fat_percent",
        value: 12,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2", "P3"],
        redundancyGroup: "bf_fat_mass_fmi",
      }),
    ]);
    const high = assessFor([
      baseObservation({
        observationId: "bf1",
        metricKey: "fat_percent",
        value: 38,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2", "P3"],
        redundancyGroup: "bf_fat_mass_fmi",
      }),
    ]);
    expect(confidenceSignature(low)).toBe(confidenceSignature(high));
  });

  it("identical provenance with opposite Waist / VAT / Lean yields identical Confidence", () => {
    const waistLow = assessFor([
      baseObservation({
        observationId: "w1",
        metricKey: "waist_circumference",
        value: 70,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H1"],
        redundancyGroup: "waist_whtr",
        comparabilityGroup: "manual_anthropometry",
        provenance: {
          sourceFactRef: null,
          sourceEventRef: null,
          scanRef: null,
          sourceDocumentRef: null,
          sourcePage: null,
          adapterId: null,
          adapterVersion: null,
          formulaVersion: null,
          inputObservationRefs: null,
          corrected: null,
          protocolId: "who_midpoint_v1",
          protocolVersion: 1,
        },
      }),
    ]);
    const waistHigh = assessFor([
      baseObservation({
        observationId: "w1",
        metricKey: "waist_circumference",
        value: 120,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H1"],
        redundancyGroup: "waist_whtr",
        comparabilityGroup: "manual_anthropometry",
        provenance: {
          sourceFactRef: null,
          sourceEventRef: null,
          scanRef: null,
          sourceDocumentRef: null,
          sourcePage: null,
          adapterId: null,
          adapterVersion: null,
          formulaVersion: null,
          inputObservationRefs: null,
          corrected: null,
          protocolId: "who_midpoint_v1",
          protocolVersion: 1,
        },
      }),
    ]);
    expect(confidenceSignature(waistLow)).toBe(confidenceSignature(waistHigh));

    const vatLow = assessFor([
      baseObservation({
        observationId: "vat1",
        metricKey: "visceral_fat_mass",
        value: 0.2,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H1"],
        redundancyGroup: "central_adiposity_vat",
        comparabilityGroup: "dxa_vat",
      }),
    ]);
    const vatHigh = assessFor([
      baseObservation({
        observationId: "vat1",
        metricKey: "visceral_fat_mass",
        value: 3.5,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H1"],
        redundancyGroup: "central_adiposity_vat",
        comparabilityGroup: "dxa_vat",
      }),
    ]);
    expect(confidenceSignature(vatLow)).toBe(confidenceSignature(vatHigh));

    const leanLow = assessFor([
      baseObservation({
        observationId: "lean1",
        metricKey: "lean_mass",
        value: 40,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H3", "P1"],
        redundancyGroup: "lean_ffm_ffmi",
      }),
    ]);
    const leanHigh = assessFor([
      baseObservation({
        observationId: "lean1",
        metricKey: "lean_mass",
        value: 75,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H3", "P1"],
        redundancyGroup: "lean_ffm_ffmi",
      }),
    ]);
    expect(confidenceSignature(leanLow)).toBe(confidenceSignature(leanHigh));
  });
});

describe("Assessment Confidence — determinism and duplicates", () => {
  it("is invariant to observation / construct / ref order shuffle", () => {
    const obsA = baseObservation({
      observationId: "bf_a",
      metricKey: "fat_percent",
      value: 22,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2", "P3"],
      redundancyGroup: "bf_fat_mass_fmi",
    });
    const obsB = baseObservation({
      observationId: "lean_b",
      metricKey: "lean_mass",
      value: 58,
      measuredAt: "2026-04-01T00:00:00.000Z",
      constructEligibility: ["H3", "P1"],
      redundancyGroup: "lean_ffm_ffmi",
    });

    const forward = assessFor([obsA, obsB]);
    const reversed = assessFor([obsB, obsA]);
    expect(confidenceSignature(forward)).toBe(confidenceSignature(reversed));

    // Shuffle Resolver construct array order before Confidence.
    const bundle = bundleWith([obsA, obsB]);
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const shuffledResolution = {
      ...resolution,
      constructs: [...resolution.constructs].reverse(),
    };
    const fromShuffled = assessBodyCompositionConfidence({
      bundle,
      resolution: shuffledResolution,
      asOf: AS_OF,
    });
    expect(confidenceSignature(fromShuffled)).toBe(confidenceSignature(forward));
  });

  it("does not boost Confidence from duplicate observation IDs", () => {
    const obs = baseObservation({
      observationId: "bf1",
      metricKey: "fat_percent",
      value: 22,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
    });
    const single = assessFor([obs]);
    const duplicated = assessFor([obs, { ...obs }, { ...obs }]);
    expect(single.constructAssessments.find((c) => c.constructId === "H2")!.label).toBeNull();
    expect(duplicated.constructAssessments.find((c) => c.constructId === "H2")!.label).toBeNull();
    expect(single.constructAssessments.find((c) => c.constructId === "H2")!.status).toBe(
      duplicated.constructAssessments.find((c) => c.constructId === "H2")!.status,
    );
    expect(
      single.constructAssessments.find((c) => c.constructId === "H2")!.confidenceBasis
        .factualDimensions.primaryRefCount,
    ).toBe(
      duplicated.constructAssessments.find((c) => c.constructId === "H2")!.confidenceBasis
        .factualDimensions.primaryRefCount,
    );
  });

  it("does not upgrade label from more observations in one scan event", () => {
    const sharedScan = "scan_shared_1";
    const one = assessFor([
      baseObservation({
        observationId: "bf1",
        metricKey: "fat_percent",
        value: 22,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2"],
        redundancyGroup: "bf_fat_mass_fmi",
        provenance: {
          sourceFactRef: null,
          sourceEventRef: null,
          scanRef: sharedScan,
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
      }),
    ]);
    const many = assessFor([
      baseObservation({
        observationId: "bf1",
        metricKey: "fat_percent",
        value: 22,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2"],
        redundancyGroup: "bf_fat_mass_fmi",
        provenance: {
          sourceFactRef: null,
          sourceEventRef: null,
          scanRef: sharedScan,
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
      }),
      baseObservation({
        observationId: "fm1",
        metricKey: "fat_mass",
        value: 18,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2"],
        redundancyGroup: "bf_fat_mass_fmi",
        provenance: {
          sourceFactRef: null,
          sourceEventRef: null,
          scanRef: sharedScan,
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
      }),
    ]);
    // Labels remain null either way — no automatic boost.
    expect(one.constructAssessments.find((c) => c.constructId === "H2")!.label).toBeNull();
    expect(many.constructAssessments.find((c) => c.constructId === "H2")!.label).toBeNull();
    expect(
      many.constructAssessments.find((c) => c.constructId === "H2")!.confidenceBasis
        .factualDimensions.independenceState,
    ).toBe("independence_unknown");
  });
});
