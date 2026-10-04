/**
 * §4.5 simultaneous failure precedence (A–I).
 */
import { describe, expect, it } from "@jest/globals";
import type { BodyCompositionEvidenceResolution, BodyCompositionResolverConstructResult } from "@oli/contracts";

import { resolveBodyCompositionEvidence } from "../../resolver/resolveBodyCompositionEvidence";
import { AS_OF, heightObservation } from "../../resolver/testFixtures";
import { evaluateH1, evaluateH2, evaluateP1 } from "../evaluateConstruct";
import { scoreHealthComposition } from "../scoreHealthComposition";
import { parseAsOfMs } from "../recency";
import { DAY_MS } from "../constants";
import { adultBundle, healthReadyBundle, scoreHealthFromBundle } from "../testFixtures";

function construct(
  resolution: BodyCompositionEvidenceResolution,
  id: string,
): BodyCompositionResolverConstructResult {
  return resolution.constructs.find((c) => c.constructId === id)!;
}

function resolvedH1Construct(
  resolution: BodyCompositionEvidenceResolution,
  whtrObservationId: string,
): BodyCompositionResolverConstructResult {
  const h1 = construct(resolution, "H1");
  return {
    ...h1,
    status: "resolved",
    primaryEvidenceRefs: [whtrObservationId],
    channels: h1.channels.map((ch) =>
      ch.channelId === "whtr_standardized"
        ? { ...ch, status: "resolved", primaryEvidenceRefs: [whtrObservationId] }
        : ch,
    ),
  };
}

const AS_OF_MS = parseAsOfMs(AS_OF)!;
const STALE_AT = new Date(AS_OF_MS - 181 * DAY_MS).toISOString();
const FUTURE_AT = new Date(AS_OF_MS + DAY_MS).toISOString();

describe("§4.5 construct precedence A–D", () => {
  it("A. sex missing + evidence too old → required_sex_missing (rank 3 before 12)", () => {
    const bundle = healthReadyBundle({ measuredAt: STALE_AT });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const { result } = evaluateH2({
      bundle,
      construct: construct(resolution, "H2"),
      asOfMs: AS_OF_MS,
      sex: null,
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("required_sex_missing");
  });

  it("B. Resolver conflict + stale → conflict_unresolved (rank 6 before 12)", () => {
    const bundle = healthReadyBundle({ measuredAt: STALE_AT });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h2 = { ...construct(resolution, "H2"), status: "conflict" as const };
    const { result } = evaluateH2({
      bundle,
      construct: h2,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("conflict_unresolved");
  });

  it("C. P1 policy_not_frozen + FFMI unavailable → policy_not_frozen (rank 7 before 11)", () => {
    const bundle = adultBundle([heightObservation()], { sexAtBirth: "male" });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const p1 = { ...construct(resolution, "P1"), status: "policy_not_frozen" as const };
    const { result } = evaluateP1({
      bundle,
      construct: p1,
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("policy_not_frozen");
    expect(result.primaryReason).not.toBe("p1_ffmi_not_resolved");
  });

  it("D. H1 future evidence + unsupported protocol → future_evidence (rank 2 before 5)", () => {
    const bundle = healthReadyBundle({ whtr: 0.5, measuredAt: FUTURE_AT });
    const waist = bundle.observations.find((o) => o.metricKey === "waist_circumference")!;
    waist.provenance = {
      ...waist.provenance,
      protocolId: "unknown",
      protocolVersion: null,
    };
    for (const obs of bundle.observations) {
      if (obs.metricKey === "whtr" || obs.metricKey === "height" || obs.metricKey === "waist_circumference") {
        obs.measuredAt = FUTURE_AT;
      }
    }
    const whtrId =
      bundle.observations.find((o) => o.metricKey === "whtr")?.observationId ?? "whtr1";
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const { result } = evaluateH1({
      bundle,
      construct: resolvedH1Construct(resolution, whtrId),
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("future_evidence");
  });
});

describe("§4.5 engine + construct precedence E–I", () => {
  it("E. future + too-old inputs in aggregate set → engine future_evidence", () => {
    const bundle = healthReadyBundle({ measuredAt: "2026-05-01T00:00:00.000Z" });
    const fmiObs = bundle.observations.find((o) => o.metricKey === "fmi")!;
    const almiObs = bundle.observations.find((o) => o.metricKey === "almi")!;
    fmiObs.measuredAt = FUTURE_AT;
    almiObs.measuredAt = STALE_AT;
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h2 = {
      ...construct(resolution, "H2"),
      status: "resolved" as const,
      primaryEvidenceRefs: [fmiObs.observationId],
      channels: construct(resolution, "H2").channels.map((ch) =>
        ch.channelId === "fmi"
          ? { ...ch, status: "resolved" as const, primaryEvidenceRefs: [fmiObs.observationId] }
          : ch,
      ),
    };
    const h3 = {
      ...construct(resolution, "H3"),
      status: "resolved" as const,
      primaryEvidenceRefs: [almiObs.observationId],
      channels: construct(resolution, "H3").channels.map((ch) =>
        ch.channelId === "almi"
          ? { ...ch, status: "resolved" as const, primaryEvidenceRefs: [almiObs.observationId] }
          : ch,
      ),
    };
    const patched = {
      ...resolution,
      constructs: resolution.constructs.map((c) => {
        if (c.constructId === "H2") return h2;
        if (c.constructId === "H3") return h3;
        return c;
      }),
    };
    const result = scoreHealthComposition({ bundle, resolution: patched, asOf: AS_OF });
    expect(result.primaryReason).toBe("future_evidence");
  });

  it("F. H2 unresolved + H3/H1 OK → incomplete_health_composition with H2 root reason", () => {
    const partial = healthReadyBundle({});
    const withoutH2 = {
      ...partial,
      observations: partial.observations.filter(
        (o) => o.metricKey !== "fat_mass" && o.metricKey !== "fmi" && o.metricKey !== "fat_percent",
      ),
    };
    const result = scoreHealthFromBundle(withoutH2);
    expect(result.primaryReason).toBe("incomplete_health_composition");
    expect(result.constructScores.H1.value).not.toBeNull();
    expect(result.constructScores.H3.value).not.toBeNull();
    expect(result.constructScores.H2.value).toBeNull();
    expect(result.constructReasons.H2).toBeDefined();
  });

  it("G. malformed DOB + valid evidence → engine required_age_missing (never invalid_provenance)", () => {
    const result = scoreHealthFromBundle(healthReadyBundle({ dateOfBirth: "2020-13-40" }));
    expect(result.primaryReason).toBe("required_age_missing");
    expect(result.constructScores.H1.primaryReason).toBe("required_age_missing");
    expect(result.constructScores.H2.primaryReason).toBe("required_age_missing");
    expect(result.constructScores.H3.primaryReason).toBe("required_age_missing");
  });

  it("H. missing measuredAt + valid channel → construct invalid_provenance", () => {
    const bundle = healthReadyBundle({ whtr: 0.45 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const whtrObs = bundle.observations.find((o) => o.metricKey === "whtr")!;
    whtrObs.measuredAt = null as unknown as string;
    const { result } = evaluateH1({
      bundle,
      construct: construct(resolution, "H1"),
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("invalid_provenance");
  });

  it("I. missing measuredAt + unsupported method → invalid_provenance (rank 1 before 5)", () => {
    const bundle = healthReadyBundle({ whtr: 0.45 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const whtrObs = bundle.observations.find((o) => o.metricKey === "whtr")!;
    whtrObs.measuredAt = null as unknown as string;
    const waist = bundle.observations.find((o) => o.metricKey === "waist_circumference")!;
    waist.provenance = { ...waist.provenance, protocolId: "unknown", protocolVersion: null };
    const { result } = evaluateH1({
      bundle,
      construct: construct(resolution, "H1"),
      asOfMs: AS_OF_MS,
      sex: "male",
      subjectHeightCm: 180,
    });
    expect(result.primaryReason).toBe("invalid_provenance");
  });
});
