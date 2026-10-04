/**
 * Bounded correction regressions for Defect A (aggregate §4.2 rank 3)
 * and Defect B (H3 Resolver-primary-only — no score-layer fallback).
 */
import { describe, expect, it } from "@jest/globals";
import type {
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceResolution,
  BodyCompositionResolverConstructResult,
} from "@oli/contracts";

import { resolveBodyCompositionEvidence } from "../../resolver/resolveBodyCompositionEvidence";
import { AS_OF } from "../../resolver/testFixtures";
import { governedH3LeanChannel, observationMap } from "../channelLookup";
import { evaluateH3 } from "../evaluateConstruct";
import { parseAsOfMs } from "../recency";
import { scoreHealthComposition } from "../scoreHealthComposition";
import { scorePerformanceSupportingComposition } from "../scorePerformanceSupportingComposition";
import {
  healthReadyBundle,
  performanceReadyBundle,
} from "../testFixtures";

const AS_OF_MS = parseAsOfMs(AS_OF)!;

function cloneResolution(
  resolution: BodyCompositionEvidenceResolution,
): BodyCompositionEvidenceResolution {
  return JSON.parse(JSON.stringify(resolution)) as BodyCompositionEvidenceResolution;
}

function replaceConstruct(
  resolution: BodyCompositionEvidenceResolution,
  constructId: string,
  next: BodyCompositionResolverConstructResult,
): BodyCompositionEvidenceResolution {
  return {
    ...resolution,
    constructs: resolution.constructs.map((c) => (c.constructId === constructId ? next : c)),
  };
}

function findObs(
  observations: BodyCompositionEvidenceObservation[],
  metricKey: string,
): BodyCompositionEvidenceObservation {
  const obs = observations.find((o) => o.metricKey === metricKey);
  if (!obs) throw new Error(`missing observation ${metricKey}`);
  return obs;
}

describe("Defect A — aggregate §4.2 rank 3 measuredAt integrity", () => {
  it("HEALTH: H1 missing measuredAt → aggregate invalid_provenance (not incomplete_health_composition)", () => {
    const bundle = healthReadyBundle({ whtr: 0.45, fmi: 5, almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const whtr = findObs(bundle.observations, "whtr");
    // Defense-in-depth: resolution still points at the channel; measuredAt integrity fails.
    (whtr as { measuredAt: string | null }).measuredAt = null as unknown as string;

    const result = scoreHealthComposition({ bundle, resolution, asOf: AS_OF });
    expect(result.constructScores.H1.primaryReason).toBe("invalid_provenance");
    expect(result.constructScores.H2.value).not.toBeNull();
    expect(result.constructScores.H3.value).not.toBeNull();
    expect(result.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).not.toBe("incomplete_health_composition");
    expect(result.constructReasons.H1).toBe("invalid_provenance");
  });

  it("HEALTH: H1 malformed measuredAt → aggregate invalid_provenance", () => {
    const bundle = healthReadyBundle({ whtr: 0.45, fmi: 5, almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    findObs(bundle.observations, "whtr").measuredAt = "not-a-date";
    findObs(bundle.observations, "waist_circumference").measuredAt = "not-a-date";
    findObs(bundle.observations, "height").measuredAt = "not-a-date";

    const result = scoreHealthComposition({ bundle, resolution, asOf: AS_OF });
    expect(result.constructScores.H1.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).not.toBe("incomplete_health_composition");
  });

  it("HEALTH: H1 non-finite measuredAt → aggregate invalid_provenance", () => {
    const bundle = healthReadyBundle({ whtr: 0.45, fmi: 5, almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    // Non-finite via invalid ISO that Date.parse rejects as NaN path — use empty string.
    findObs(bundle.observations, "whtr").measuredAt = "";
    findObs(bundle.observations, "waist_circumference").measuredAt = "";
    findObs(bundle.observations, "height").measuredAt = "";

    const result = scoreHealthComposition({ bundle, resolution, asOf: AS_OF });
    expect(result.constructScores.H1.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).toBe("invalid_provenance");
  });

  it("PERFORMANCE: P1 missing measuredAt → aggregate invalid_provenance (not insufficient_core_constructs)", () => {
    const bundle = performanceReadyBundle({ ffmi: 19, fmi: 5 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const ffmi = findObs(bundle.observations, "ffmi");
    (ffmi as { measuredAt: string | null }).measuredAt = null as unknown as string;

    const result = scorePerformanceSupportingComposition({ bundle, resolution, asOf: AS_OF });
    expect(result.constructScores.P1.primaryReason).toBe("invalid_provenance");
    expect(result.constructScores.P3.value).not.toBeNull();
    expect(result.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).not.toBe("insufficient_core_constructs");
    expect(result.constructReasons.P1).toBe("invalid_provenance");
  });

  it("PERFORMANCE: P1 malformed measuredAt → aggregate invalid_provenance", () => {
    const bundle = performanceReadyBundle({ ffmi: 19, fmi: 5 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    findObs(bundle.observations, "ffmi").measuredAt = "bad";

    const result = scorePerformanceSupportingComposition({ bundle, resolution, asOf: AS_OF });
    expect(result.constructScores.P1.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).toBe("invalid_provenance");
    expect(result.primaryReason).not.toBe("insufficient_core_constructs");
  });

  it("does not collapse future/stale into invalid_provenance", () => {
    // Resolver excludes future — synthesize resolution from a valid bundle then mutate.
    const base = healthReadyBundle({ whtr: 0.45, fmi: 5, almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle: base, asOf: AS_OF });
    for (const obs of base.observations) {
      if (
        obs.metricKey === "whtr" ||
        obs.metricKey === "waist_circumference" ||
        obs.metricKey === "height" ||
        obs.metricKey === "fmi" ||
        obs.metricKey === "almi" ||
        obs.metricKey === "fat_mass" ||
        obs.metricKey === "lean_mass"
      ) {
        obs.measuredAt = new Date(AS_OF_MS + 1).toISOString();
      }
    }
    const futureResult = scoreHealthComposition({ bundle: base, resolution, asOf: AS_OF });
    expect(futureResult.primaryReason).toBe("future_evidence");
    expect(futureResult.primaryReason).not.toBe("invalid_provenance");

    const staleBase = healthReadyBundle({ whtr: 0.45, fmi: 5, almi: 8 });
    const staleResolution = resolveBodyCompositionEvidence({ bundle: staleBase, asOf: AS_OF });
    const staleAt = new Date(AS_OF_MS - 180 * 86_400_000 - 1).toISOString();
    for (const obs of staleBase.observations) {
      if (
        obs.metricKey === "whtr" ||
        obs.metricKey === "waist_circumference" ||
        obs.metricKey === "height" ||
        obs.metricKey === "fmi" ||
        obs.metricKey === "almi" ||
        obs.metricKey === "fat_mass" ||
        obs.metricKey === "lean_mass"
      ) {
        obs.measuredAt = staleAt;
      }
    }
    const staleResult = scoreHealthComposition({
      bundle: staleBase,
      resolution: staleResolution,
      asOf: AS_OF,
    });
    expect(staleResult.primaryReason).toBe("evidence_too_old");
    expect(staleResult.primaryReason).not.toBe("invalid_provenance");
  });
});

describe("Defect B — H3 Resolver primary only (no score-layer fallback)", () => {
  it("does not score ALMI when Resolver primaryEvidenceRefs[0] is unrelated even if ALMI is listed later", () => {
    const bundle = healthReadyBundle({ almi: 8, fmi: 5, whtr: 0.45 });
    const resolution = cloneResolution(
      resolveBodyCompositionEvidence({ bundle, asOf: AS_OF }),
    );
    const almiId = findObs(bundle.observations, "almi").observationId;
    const unrelatedId = "unrelated_primary_obs";
    bundle.observations.push({
      ...findObs(bundle.observations, "fat_mass"),
      observationId: unrelatedId,
      metricKey: "lean_mass",
      region: "total",
      value: 55,
    });

    const h3 = resolution.constructs.find((c) => c.constructId === "H3")!;
    const mutatedH3: BodyCompositionResolverConstructResult = {
      ...h3,
      status: "resolved",
      // Primary is unrelated; ALMI still present later in the ref list (fallback trap).
      primaryEvidenceRefs: [unrelatedId, almiId],
      channels: h3.channels.map((ch) => {
        if (ch.channelId === "almi") {
          return { ...ch, status: "resolved" as const, primaryEvidenceRefs: [almiId] };
        }
        return ch;
      }),
    };
    const mutated = replaceConstruct(resolution, "H3", mutatedH3);

    const byId = observationMap(bundle);
    expect(governedH3LeanChannel(mutatedH3, byId)).toBeNull();

    const { result } = evaluateH3({
      bundle,
      construct: mutatedH3,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.value).toBeNull();
    expect(result.primaryReason).toBe("unresolved_construct");

    const score = scoreHealthComposition({ bundle, resolution: mutated, asOf: AS_OF });
    expect(score.constructScores.H3.primaryReason).toBe("unresolved_construct");
    expect(score.constructScores.H3.value).toBeNull();
  });

  it("does not score FFMI when Resolver primary is unrelated even if FFMI is listed later", () => {
    const bundle = healthReadyBundle({ almi: 8, fmi: 5, whtr: 0.45 });
    // Ensure an FFMI observation exists in the bundle for the trap.
    const height = findObs(bundle.observations, "height");
    const ffm = {
      ...findObs(bundle.observations, "fat_mass"),
      observationId: "ffm_trap",
      metricKey: "fat_free_mass" as const,
      value: 60,
      constructEligibility: ["H3", "P1"] as const,
      redundancyGroup: "lean_ffm_ffmi" as const,
    };
    const ffmiObs: BodyCompositionEvidenceObservation = {
      ...ffm,
      observationId: "ffmi_trap",
      metricKey: "ffmi",
      value: 18.5,
      evidenceType: "calculated",
      canonicalUnit: "kg_per_m2",
      provenance: {
        ...ffm.provenance,
        formulaVersion: "ffmi_v1",
        inputObservationRefs: ["ffm_trap", height.observationId],
        scanRef: "scan_1",
      },
      constructEligibility: ["H3", "P1"],
      redundancyGroup: "lean_ffm_ffmi",
    };
    bundle.observations.push(ffm, ffmiObs);

    const resolution = cloneResolution(
      resolveBodyCompositionEvidence({ bundle, asOf: AS_OF }),
    );
    const unrelatedId = "unrelated_primary_ffmi_trap";
    bundle.observations.push({
      ...findObs(bundle.observations, "fat_mass"),
      observationId: unrelatedId,
      metricKey: "lean_mass",
      region: "total",
      value: 50,
    });

    const h3 = resolution.constructs.find((c) => c.constructId === "H3")!;
    const mutatedH3: BodyCompositionResolverConstructResult = {
      ...h3,
      status: "resolved",
      primaryEvidenceRefs: [unrelatedId, "ffmi_trap"],
      channels: h3.channels.map((ch) => {
        if (ch.channelId === "ffmi") {
          return {
            ...ch,
            status: "resolved" as const,
            primaryEvidenceRefs: ["ffmi_trap"],
          };
        }
        if (ch.channelId === "almi") {
          return { ...ch, status: "insufficient" as const, primaryEvidenceRefs: [] };
        }
        return ch;
      }),
    };

    const byId = observationMap(bundle);
    expect(governedH3LeanChannel(mutatedH3, byId)).toBeNull();
    const { result } = evaluateH3({
      bundle,
      construct: mutatedH3,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.value).toBeNull();
    expect(result.primaryReason).toBe("unresolved_construct");
  });

  it("scores ALMI when Resolver primaryEvidenceRefs[0] is ALMI", () => {
    const bundle = healthReadyBundle({ almi: 8, fmi: 5, whtr: 0.45 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h3 = resolution.constructs.find((c) => c.constructId === "H3")!;
    expect(h3.primaryEvidenceRefs[0]).toBe(findObs(bundle.observations, "almi").observationId);
    const { result } = evaluateH3({
      bundle,
      construct: h3,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.value).not.toBeNull();
    expect(result.primaryReason).toBeNull();
  });

  it("scores FFMI when Resolver primaryEvidenceRefs[0] is FFMI (no ALMI)", () => {
    const bundle = performanceReadyBundle({ ffmi: 18.5, fmi: 5 });
    // performance bundle has FFMI; build a Health-like H3 construct pointing at FFMI primary.
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h3Base = resolution.constructs.find((c) => c.constructId === "H3")!;
    const ffmiId = findObs(bundle.observations, "ffmi").observationId;
    const h3: BodyCompositionResolverConstructResult = {
      ...h3Base,
      status: "resolved",
      primaryEvidenceRefs: [ffmiId],
      channels: h3Base.channels.map((ch) => {
        if (ch.channelId === "ffmi") {
          return { ...ch, status: "resolved" as const, primaryEvidenceRefs: [ffmiId] };
        }
        if (ch.channelId === "almi") {
          return { ...ch, status: "insufficient" as const, primaryEvidenceRefs: [] };
        }
        return ch;
      }),
    };
    const { result } = evaluateH3({
      bundle,
      construct: h3,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.value).not.toBeNull();
    expect(result.primaryReason).toBeNull();
  });

  it("policy_not_frozen remains fail-closed without fallback", () => {
    const bundle = healthReadyBundle({ almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h3 = {
      ...resolution.constructs.find((c) => c.constructId === "H3")!,
      status: "policy_not_frozen" as const,
    };
    const { result } = evaluateH3({
      bundle,
      construct: h3,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("policy_not_frozen");
  });

  it("multiple_valid remains fail-closed without fallback", () => {
    const bundle = healthReadyBundle({ almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h3 = {
      ...resolution.constructs.find((c) => c.constructId === "H3")!,
      status: "multiple_valid" as const,
    };
    const { result } = evaluateH3({
      bundle,
      construct: h3,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("multiple_valid_unfrozen");
  });
});

describe("Defect A — construct root causes retained under aggregate rank 3", () => {
  it("preserves H1 invalid_provenance in constructReasons when aggregate is invalid_provenance", () => {
    const bundle = healthReadyBundle({ whtr: 0.5, fmi: 5, almi: 8 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    (findObs(bundle.observations, "whtr") as { measuredAt: string | null }).measuredAt =
      null as unknown as string;
    const result = scoreHealthComposition({ bundle, resolution, asOf: AS_OF });
    expect(result.primaryReason).toBe("invalid_provenance");
    expect(result.constructReasons.H1).toBe("invalid_provenance");
  });
});

describe("P1 regression — FFM/Lean cannot substitute for FFMI", () => {
  it("does not score P1 from FFM/Lean when FFMI channel is unresolved", () => {
    const bundle = performanceReadyBundle({ ffmi: 19, fmi: 5 });
    const resolution = cloneResolution(
      resolveBodyCompositionEvidence({ bundle, asOf: AS_OF }),
    );
    const p1 = resolution.constructs.find((c) => c.constructId === "P1")!;
    const ffmId = findObs(bundle.observations, "fat_free_mass").observationId;
    const mutatedP1: BodyCompositionResolverConstructResult = {
      ...p1,
      status: "resolved",
      primaryEvidenceRefs: [ffmId],
      channels: p1.channels.map((ch) => {
        if (ch.channelId === "ffmi") {
          return { ...ch, status: "insufficient" as const, primaryEvidenceRefs: [] };
        }
        if (ch.channelId === "fat_free_mass") {
          return { ...ch, status: "resolved" as const, primaryEvidenceRefs: [ffmId] };
        }
        return ch;
      }),
    };
    const mutated = replaceConstruct(resolution, "P1", mutatedP1);
    const result = scorePerformanceSupportingComposition({
      bundle,
      resolution: mutated,
      asOf: AS_OF,
    });
    expect(result.constructScores.P1.value).toBeNull();
    expect(result.constructScores.P1.primaryReason).toBe("p1_ffmi_not_resolved");
  });
});
