/**
 * Evidence Resolver scientific boundary invariants.
 */
import { describe, expect, it } from "@jest/globals";
import { BODY_COMPOSITION_RESOLVER_VERSION } from "@oli/contracts";

import { resolveBodyCompositionEvidence } from "../resolveBodyCompositionEvidence";
import { BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES } from "../policy";
import { AS_OF, baseObservation, bundleWith, emptyBundle } from "../testFixtures";

describe("body composition evidence resolver invariants", () => {
  it("uses draft resolver version only", () => {
    expect(BODY_COMPOSITION_RESOLVER_VERSION).toBe("body_composition_resolver_draft_v1");
    const r = resolveBodyCompositionEvidence({ bundle: emptyBundle(), asOf: AS_OF });
    expect(r.resolverVersion).toBe("body_composition_resolver_draft_v1");
  });

  it("does not mutate the source bundle", () => {
    const obs = baseObservation({
      observationId: "bf1",
      metricKey: "fat_percent",
      value: 22,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
    });
    const bundle = bundleWith([obs]);
    const before = JSON.stringify(bundle);
    resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    expect(JSON.stringify(bundle)).toBe(before);
  });

  it("never averages multi-source values or picks most-favorable BF%", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
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
          value: 18.0, // more "favorable" if lower-is-better were used
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
      asOf: AS_OF,
    });
    const h2 = r.constructs.find((c) => c.constructId === "H2")!;
    expect(h2.primaryEvidenceRefs).toEqual(["dxa_bf"]);
    expect(h2.supportingEvidenceRefs).toContain("bia_bf");
  });

  it("keeps Lean / FFM / SMM and VAT mass / volume boundaries", () => {
    const policies = BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES;
    const h3 = policies.find((p) => p.constructId === "H3")!;
    const h1 = policies.find((p) => p.constructId === "H1")!;
    expect(h3.channels.some((c) => c.metricKeys.includes("skeletal_muscle_mass"))).toBe(false);
    expect(h1.channels.find((c) => c.channelId === "vat_mass")?.metricKeys).toEqual([
      "visceral_fat_mass",
    ]);
    expect(h1.channels.find((c) => c.channelId === "vat_volume")?.metricKeys).toEqual([
      "visceral_fat_volume",
    ]);
  });

  it("does not derive Fat Mass from BF% and does not invent ALMI from total lean", () => {
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
          observationId: "lean1",
          metricKey: "lean_mass",
          value: 58,
          measuredAt: "2026-05-01T00:00:00.000Z",
          constructEligibility: ["H3"],
          redundancyGroup: "lean_ffm_ffmi",
        }),
      ]),
      asOf: AS_OF,
    });
    const metrics = r.constructs.flatMap((c) => c.comparabilityMetadata.metricsPresent);
    expect(metrics).not.toContain("fat_mass");
    expect(metrics).not.toContain("almi");
    expect(r.constructs.find((c) => c.constructId === "H3")!.channels.find((ch) => ch.channelId === "almi")?.status).toBe(
      "insufficient",
    );
  });

  it("forbids identity, confidence, and score fields on output", () => {
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
    const keys = Object.keys(r);
    expect(keys).not.toContain("uid");
    expect(keys).not.toContain("userId");
    expect(keys).not.toContain("confidence");
    expect(keys).not.toContain("healthScore");
    expect(keys).not.toContain("performanceScore");
    const serialized = JSON.stringify(r);
    expect(serialized).not.toMatch(/"score"\s*:/);
    expect(serialized).not.toMatch(/Limited|Moderate|Good|Strong|Very High/);
  });

  it("keeps Apple Health unlabeled composition method as unknown at selection layer", () => {
    const r = resolveBodyCompositionEvidence({
      bundle: bundleWith([
        baseObservation({
          observationId: "ah_bf",
          metricKey: "fat_percent",
          value: 22,
          measuredAt: "2026-05-01T00:00:00.000Z",
          evidenceType: "estimated",
          source: {
            sourceSystem: "apple_health",
            measurementMethod: "unknown",
            deviceFamily: null,
            deviceModel: null,
          },
          constructEligibility: ["H2", "P3"],
          redundancyGroup: "bf_fat_mass_fmi",
          comparabilityGroup: "unknown",
        }),
      ]),
      asOf: AS_OF,
    });
    const h2 = r.constructs.find((c) => c.constructId === "H2")!;
    expect(h2.comparabilityMetadata.methodFamiliesPresent).toContain("unknown");
    expect(h2.primaryEvidenceRefs).toEqual(["ah_bf"]);
  });
});
