/**
 * Dual Score engine integration — resolver coupling, determinism, privacy, grids.
 */
import { describe, expect, it } from "@jest/globals";
import type { BodyCompositionEvidenceResolution } from "@oli/contracts";

import { assessBodyCompositionConfidence } from "../../confidence/assessBodyCompositionConfidence";
import { resolveBodyCompositionEvidence } from "../../resolver/resolveBodyCompositionEvidence";
import { AS_OF, baseObservation, heightObservation } from "../../resolver/testFixtures";
import { DAY_MS } from "../constants";
import {
  H1_whtr,
  H2_fmi_female,
  H2_fmi_male,
  H3_almi_female,
  H3_almi_male,
  Health_aggregate,
  P1_ffmi_female,
  P1_ffmi_male,
  P3_fmi_female,
  P3_fmi_male,
  PerformanceSupporting_aggregate,
} from "../transforms";
import { scoreHealthComposition } from "../scoreHealthComposition";
import { scorePerformanceSupportingComposition } from "../scorePerformanceSupportingComposition";
import {
  ADULT_DOB,
  adultBundle,
  healthReadyBundle,
  performanceReadyBundle,
  scoreHealthFromBundle,
  scorePerfFromBundle,
} from "../testFixtures";

function construct(resolution: BodyCompositionEvidenceResolution, id: string) {
  return resolution.constructs.find((c) => c.constructId === id)!;
}

const AS_OF_MS = Date.parse(AS_OF);
const STALE = new Date(AS_OF_MS - 181 * DAY_MS).toISOString();
const FUTURE = new Date(AS_OF_MS + DAY_MS).toISOString();

describe("Health engine integration", () => {
  it("H1: invalid protocol / missing height / future / stale / multiple_valid WHtR+VAT scores WHtR", () => {
    const badProtocol = healthReadyBundle({ whtr: 0.45 });
    const badProtocolResolution = resolveBodyCompositionEvidence({
      bundle: badProtocol,
      asOf: AS_OF,
    });
    const waist = badProtocol.observations.find((o) => o.metricKey === "waist_circumference")!;
    waist.provenance = { ...waist.provenance, protocolId: "unknown", protocolVersion: null };
    const h1 = scoreHealthComposition({
      bundle: badProtocol,
      resolution: badProtocolResolution,
      asOf: AS_OF,
    });
    expect(h1.constructScores.H1.primaryReason).toBe("unsupported_method");

    const noHeight = healthReadyBundle({ heightCm: 180 });
    noHeight.subjectContext.height = { valueCm: null, effectiveAt: null, sourceSystem: null };
    const whtrObs = noHeight.observations.find((o) => o.metricKey === "whtr")!;
    whtrObs.provenance = {
      ...whtrObs.provenance,
      inputObservationRefs: ["w1"],
    };
    noHeight.observations = noHeight.observations.filter((o) => o.metricKey !== "height");
    const noHeightResolution = resolveBodyCompositionEvidence({ bundle: noHeight, asOf: AS_OF });
    const patchedNoHeight = {
      ...noHeightResolution,
      constructs: noHeightResolution.constructs.map((c) =>
        c.constructId === "H1"
          ? {
              ...c,
              status: "resolved" as const,
              primaryEvidenceRefs: [whtrObs.observationId],
              channels: c.channels.map((ch) =>
                ch.channelId === "whtr_standardized"
                  ? {
                      ...ch,
                      status: "resolved" as const,
                      primaryEvidenceRefs: [whtrObs.observationId],
                    }
                  : ch,
              ),
            }
          : c,
      ),
    };
    expect(
      scoreHealthComposition({
        bundle: noHeight,
        resolution: patchedNoHeight,
        asOf: AS_OF,
      }).constructScores.H1.primaryReason,
    ).toBe("required_height_missing");

    const future = healthReadyBundle({ measuredAt: "2026-05-01T00:00:00.000Z" });
    const futureResolution = resolveBodyCompositionEvidence({ bundle: future, asOf: AS_OF });
    const futureWhtr = future.observations.find((o) => o.metricKey === "whtr")!;
    for (const obs of future.observations) {
      if (obs.metricKey === "whtr" || obs.metricKey === "waist_circumference" || obs.metricKey === "height") {
        obs.measuredAt = FUTURE;
      }
    }
    const patchedFuture = {
      ...futureResolution,
      constructs: futureResolution.constructs.map((c) =>
        c.constructId === "H1"
          ? {
              ...c,
              status: "resolved" as const,
              primaryEvidenceRefs: [futureWhtr.observationId],
              channels: c.channels.map((ch) =>
                ch.channelId === "whtr_standardized"
                  ? {
                      ...ch,
                      status: "resolved" as const,
                      primaryEvidenceRefs: [futureWhtr.observationId],
                    }
                  : ch,
              ),
            }
          : c,
      ),
    };
    const futureResult = scoreHealthComposition({
      bundle: future,
      resolution: patchedFuture,
      asOf: AS_OF,
    });
    expect(futureResult.constructScores.H1.primaryReason).toBe("future_evidence");
    expect(futureResult.primaryReason).toBe("future_evidence");

    const stale = healthReadyBundle({ measuredAt: STALE });
    expect(scoreHealthFromBundle(stale).primaryReason).toBe("evidence_too_old");

    const multiBundle = healthReadyBundle({ whtr: 0.45 });
    const multiResolution = resolveBodyCompositionEvidence({ bundle: multiBundle, asOf: AS_OF });
    const multiWhtrId = multiBundle.observations.find((o) => o.metricKey === "whtr")!.observationId;
    const patchedMulti = {
      ...multiResolution,
      constructs: multiResolution.constructs.map((c) =>
        c.constructId === "H1"
          ? {
              ...c,
              status: "multiple_valid" as const,
              primaryEvidenceRefs: [multiWhtrId],
              channels: c.channels.map((ch) =>
                ch.channelId === "whtr_standardized"
                  ? {
                      ...ch,
                      status: "resolved" as const,
                      primaryEvidenceRefs: [multiWhtrId],
                    }
                  : ch,
              ),
            }
          : c,
      ),
    };
    const scored = scoreHealthComposition({
      bundle: multiBundle,
      resolution: patchedMulti,
      asOf: AS_OF,
    });
    expect(scored.constructScores.H1.value).toBeCloseTo(H1_whtr(0.45)!, 5);
  });

  it("H2: DXA pass, BIA fail, missing sex", () => {
    expect(scoreHealthFromBundle(healthReadyBundle({ fmi: 5.5 })).constructScores.H2.value).not.toBeNull();

    const healthBia = healthReadyBundle({});
    const fm = healthBia.observations.find((o) => o.observationId === "fm1")!;
    fm.source = { ...fm.source, measurementMethod: "consumer_bia" };
    expect(scoreHealthFromBundle(healthBia).constructScores.H2.primaryReason).toBe(
      "unsupported_method",
    );

    const noSex = healthReadyBundle({ sex: "male" });
    noSex.subjectContext.sexAtBirth = "unspecified";
    expect(scoreHealthFromBundle(noSex).constructScores.H2.primaryReason).toBe(
      "required_sex_missing",
    );
  });

  it("H3: Resolver primary channel controls ALMI vs FFMI (score layer does not select)", () => {
    const bundle = healthReadyBundle({ almi: 7.5 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const h3 = construct(resolution, "H3");
    expect(h3.status).toBe("resolved");
    const primaryObs = bundle.observations.find((o) => o.observationId === h3.primaryEvidenceRefs[0]);
    expect(primaryObs?.metricKey).toBe("almi");
    expect(scoreHealthFromBundle(bundle).constructScores.H3.value).toBe(H3_almi_male(7.5));
  });

  it("withholds Health aggregate when any core missing", () => {
    const partial = healthReadyBundle({});
    partial.observations = partial.observations.filter((o) => o.metricKey !== "whtr");
    const result = scoreHealthFromBundle(partial);
    expect(result.primaryReason).toBe("incomplete_health_composition");
    expect(result.score).toBeNull();
  });
});

describe("Performance engine integration", () => {
  it("calculates performance plateaus end-to-end (93.5 max / 9.0 min)", () => {
    function scorePerformanceReady(args: Parameters<typeof performanceReadyBundle>[0]) {
      const bundle = performanceReadyBundle(args);
      const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
      const ffmiId = bundle.observations.find((o) => o.metricKey === "ffmi")!.observationId;
      const patched = {
        ...resolution,
        constructs: resolution.constructs.map((c) => {
          if (c.constructId !== "P1") return c;
          return {
            ...c,
            status: "resolved" as const,
            primaryEvidenceRefs: [ffmiId],
            channels: c.channels.map((ch) =>
              ch.channelId === "ffmi"
                ? { ...ch, status: "resolved" as const, primaryEvidenceRefs: [ffmiId] }
                : ch,
            ),
          };
        }),
      };
      return scorePerformanceSupportingComposition({ bundle, resolution: patched, asOf: AS_OF });
    }

    expect(scorePerformanceReady({ ffmi: 20.5, fmi: 7 }).score).toBeCloseTo(93.5, 1);
    expect(scorePerformanceReady({ ffmi: 16, fmi: 16 }).score).toBeCloseTo(9.0, 1);
  });

  it("P1 policy_not_frozen fail-closed; p1_ffmi_not_resolved precedence", () => {
    const empty = adultBundle([heightObservation()], { sexAtBirth: "male" });
    const baseResolution = resolveBodyCompositionEvidence({ bundle: empty, asOf: AS_OF });
    const patched = {
      ...baseResolution,
      constructs: baseResolution.constructs.map((c) =>
        c.constructId === "P1" ? { ...c, status: "policy_not_frozen" as const } : c,
      ),
    };
    const r = scorePerformanceSupportingComposition({
      bundle: empty,
      resolution: patched,
      asOf: AS_OF,
    });
    expect(r.constructScores.P1.primaryReason).toBe("policy_not_frozen");

    const emptyPerf = adultBundle([heightObservation()], { sexAtBirth: "male" });
    const perfBaseResolution = resolveBodyCompositionEvidence({ bundle: emptyPerf, asOf: AS_OF });
    const p1ResolvedNoFfmi = {
      ...perfBaseResolution,
      constructs: perfBaseResolution.constructs.map((c) =>
        c.constructId === "P1"
          ? {
              ...c,
              status: "resolved" as const,
              channels: c.channels.map((ch) =>
                ch.channelId === "ffmi"
                  ? { ...ch, status: "insufficient" as const, primaryEvidenceRefs: [] }
                  : ch,
              ),
            }
          : c,
      ),
    };
    const p1Missing = scorePerformanceSupportingComposition({
      bundle: emptyPerf,
      resolution: p1ResolvedNoFfmi,
      asOf: AS_OF,
    });
    expect(p1Missing.constructScores.P1.primaryReason).toBe("p1_ffmi_not_resolved");
  });

  it("P3 BIA fail and insufficient cores when P1/P3 missing", () => {
    const bia = performanceReadyBundle({ method: "consumer_bia" });
    expect(scorePerfFromBundle(bia).constructScores.P3.primaryReason).toBe("unsupported_method");

    const partial = adultBundle([heightObservation()], { sexAtBirth: "male" });
    const r = scorePerfFromBundle(partial);
    expect(r.primaryReason).toBe("insufficient_core_constructs");
  });
});

describe("Resolver statuses and methods", () => {
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

  it.each(statuses)("handles construct status %s without throwing", (status) => {
    const bundle = healthReadyBundle({});
    const base = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const patched = {
      ...base,
      constructs: base.constructs.map((c) =>
        c.constructId === "H2" ? { ...c, status } : c,
      ),
    };
    expect(() =>
      scoreHealthComposition({ bundle, resolution: patched, asOf: AS_OF }),
    ).not.toThrow();
  });

  it("maps measurement methods DXA / consumer_bia / unknown / apple health / withings", () => {
    const methods = [
      ["dxa", null],
      ["consumer_bia", "unsupported_method"],
    ] as const;
    for (const [method, reason] of methods) {
      const bundle = performanceReadyBundle({ method: method as "dxa" | "consumer_bia" });
      const r = scorePerfFromBundle(bundle);
      if (reason) {
        expect(r.constructScores.P3.primaryReason).toBe(reason);
      } else {
        expect(r.constructScores.P3.value).not.toBeNull();
      }
    }
    const unknown = baseObservation({
      observationId: "fm_u",
      metricKey: "fat_mass",
      value: 15,
      measuredAt: "2026-05-01T00:00:00.000Z",
      constructEligibility: ["H2"],
      source: { sourceSystem: "manual", measurementMethod: "unknown", deviceFamily: null, deviceModel: null },
    });
    expect(
      scoreHealthFromBundle(adultBundle([heightObservation(), unknown], { sexAtBirth: "male" }))
        .constructScores.H2.primaryReason,
    ).toBe("unresolved_construct");
  });
});

describe("Confidence non-dependency and determinism", () => {
  it("confidence labels remain null and scores ignore confidence", () => {
    const bundle = healthReadyBundle({});
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const confidence = assessBodyCompositionConfidence({ bundle, resolution, asOf: AS_OF });
    expect(JSON.stringify(confidence)).not.toMatch(/"label":\s*"(strong|limited|good|moderate)"/);
    const scored = scoreHealthFromBundle(bundle);
    const scored2 = scoreHealthFromBundle(bundle);
    expect(scored).toEqual(scored2);
  });

  it("shuffling constructs/channels/refs yields identical output", () => {
    const bundle = healthReadyBundle({ whtr: 0.48, fmi: 6, almi: 7.5 });
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const shuffledResolution = {
      ...resolution,
      constructs: [...resolution.constructs].reverse().map((c) => ({
        ...c,
        channels: [...c.channels].reverse(),
        primaryEvidenceRefs: [...c.primaryEvidenceRefs].reverse(),
      })),
    };
    const a = scoreHealthComposition({ bundle, resolution, asOf: AS_OF });
    const b = scoreHealthComposition({ bundle, resolution: shuffledResolution, asOf: AS_OF });
    expect(a).toEqual(b);
  });

  it("deep-freezes inputs — bundle and resolution unchanged", () => {
    const bundle = healthReadyBundle({});
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const beforeB = JSON.stringify(bundle);
    const beforeR = JSON.stringify(resolution);
    scoreHealthFromBundle(bundle);
    scorePerfFromBundle(performanceReadyBundle({}));
    expect(JSON.stringify(bundle)).toBe(beforeB);
    expect(JSON.stringify(resolution)).toBe(beforeR);
  });
});

describe("Synthetic validation grids", () => {
  function range(n: number, start: number, step: number): number[] {
    return Array.from({ length: n }, (_, i) => start + i * step);
  }

  it("Health grid n=9282 within [6.5, 95.6] without NaN", () => {
    const whtrs = range(21, 0.2, 0.035);
    const fmis = range(13, 3, 1.5);
    const almis = range(17, 4, 0.5);
    const scores: number[] = [];
    for (const sex of ["male", "female"] as const) {
      for (const w of whtrs) {
        for (const f of fmis) {
          for (const a of almis) {
            const h1 = H1_whtr(w)!;
            const h2 = sex === "male" ? H2_fmi_male(f)! : H2_fmi_female(f)!;
            const h3 = sex === "male" ? H3_almi_male(a)! : H3_almi_female(a)!;
            const s = Health_aggregate(h1, h2, h3)!;
            scores.push(s);
            expect(Number.isFinite(s)).toBe(true);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(100);
          }
        }
      }
    }
    expect(scores.length).toBe(9282);
    expect(Math.min(...scores)).toBeCloseTo(6.5, 1);
    expect(Math.max(...scores)).toBeCloseTo(95.6, 1);
  });

  it("Performance grid n=578 within [9.0, 93.5] without NaN", () => {
    const ffmis = range(17, 16, 0.5);
    const fmis = range(17, 2, 1);
    const scores: number[] = [];
    for (const sex of ["male", "female"] as const) {
      for (const p of ffmis) {
        for (const f of fmis) {
          const p1 = sex === "male" ? P1_ffmi_male(p)! : P1_ffmi_female(p)!;
          const p3 = sex === "male" ? P3_fmi_male(f)! : P3_fmi_female(f)!;
          const s = PerformanceSupporting_aggregate(p1, p3)!;
          scores.push(s);
          expect(Number.isFinite(s)).toBe(true);
        }
      }
    }
    expect(scores.length).toBe(578);
    expect(Math.min(...scores)).toBeCloseTo(9.0, 1);
    expect(Math.max(...scores)).toBeCloseTo(93.5, 1);
  });
});

describe("Privacy-safe diagnostics", () => {
  it("diagnostics omit observation IDs, DOB, raw inputs, uid", () => {
    const bundle = healthReadyBundle({
      whtr: 0.55,
      fmi: 8,
      almi: 7,
      dateOfBirth: ADULT_DOB,
    });
    const result = scoreHealthFromBundle(bundle);
    const json = JSON.stringify(result.diagnostics);
    expect(json).not.toMatch(/fm1|w1|observationId/);
    expect(json).not.toMatch(/1990-01-15|dateOfBirth/);
    expect(json).not.toMatch(/uid|userId|accountId/);
    expect(json).not.toMatch(/0\.55|"value":\s*8/);
  });
});
