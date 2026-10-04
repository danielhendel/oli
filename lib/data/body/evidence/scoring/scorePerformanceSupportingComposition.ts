/**
 * Performance-Supporting Composition internal draft score engine.
 *
 * version: body_composition_performance_supporting_score_draft_v1
 *
 * Pure domain. No Firebase, network, React, AsyncStorage, Date.now(),
 * persistence, API, or consumer UI.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionPerformanceSupportingScoreResult,
  BodyCompositionScoreReasonCode,
} from "@oli/contracts";
import {
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
  BODY_COMPOSITION_RESOLVER_VERSION,
  bodyCompositionEvidenceResolutionSchema,
  bodyCompositionPerformanceSupportingScoreResultSchema,
} from "@oli/contracts";

import { adultAgeOk } from "./age";
import { MAX_SCORE_CONSTRUCT_GAP_MS } from "./constants";
import { parseScoreSex, parseSubjectHeightCm } from "./demographics";
import {
  constructReasonsFromScores,
  evaluateP1,
  evaluateP3,
  type MeasuredAtIntegrity,
} from "./evaluateConstruct";
import {
  eraGapMs,
  measuredAtReason,
  parseAsOfMs,
  type ScoringTimestampInput,
} from "./recency";
import { PerformanceSupporting_aggregate } from "./transforms";

export type ScorePerformanceSupportingCompositionInput = {
  bundle: BodyCompositionEvidenceBundle;
  /** Approved Resolver output — score must not mutate or re-select evidence. */
  resolution: unknown;
  /** Explicit evaluation instant — never Date.now(). */
  asOf: string;
  performanceSupportingScoreVersion?: typeof BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION;
  resolverVersion?: typeof BODY_COMPOSITION_RESOLVER_VERSION;
};

function emptyConstruct(reason: BodyCompositionScoreReasonCode) {
  return { value: null as null, primaryReason: reason };
}

function mergeInputs(groups: ScoringTimestampInput[][]): ScoringTimestampInput[] {
  return groups.flat();
}

/**
 * Aggregate §4.2 ranks 3–6.
 * Rank 3 uses explicit measuredAtIntegrity from construct evaluation —
 * never inferred from filtered finite timestamp arrays alone.
 */
function engineMeasuredAtGate(args: {
  measuredAtIntegrity: readonly MeasuredAtIntegrity[];
  inputs: ScoringTimestampInput[];
  asOfMs: number;
}): BodyCompositionScoreReasonCode | null {
  if (args.measuredAtIntegrity.includes("invalid")) {
    return "invalid_provenance";
  }
  for (const input of args.inputs) {
    const r = measuredAtReason(input.measuredAtMs, args.asOfMs);
    if (r === "future_evidence") return "future_evidence";
  }
  for (const input of args.inputs) {
    const r = measuredAtReason(input.measuredAtMs, args.asOfMs);
    if (r === "evidence_too_old") return "evidence_too_old";
  }
  if (args.inputs.length >= 2 && eraGapMs(args.inputs) > MAX_SCORE_CONSTRUCT_GAP_MS) {
    return "evidence_era_mismatch";
  }
  return null;
}

/**
 * Compute internal Performance-Supporting Composition draft score.
 * Public release remains NO-GO. P2 has 0% weight and is not scored.
 */
export function scorePerformanceSupportingComposition(
  input: ScorePerformanceSupportingCompositionInput,
): BodyCompositionPerformanceSupportingScoreResult {
  const version =
    input.performanceSupportingScoreVersion ??
    BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION;
  const asOf = input.asOf;

  const fail = (
    primaryReason: BodyCompositionScoreReasonCode,
    constructScores: BodyCompositionPerformanceSupportingScoreResult["constructScores"],
    completeness: BodyCompositionEvidenceBundle["completeness"],
    safeNotes: string[],
  ): BodyCompositionPerformanceSupportingScoreResult => {
    const constructReasons = constructReasonsFromScores(constructScores);
    const availableConstructCount = [constructScores.P1, constructScores.P3].filter(
      (c) => c.value != null,
    ).length;
    const result: BodyCompositionPerformanceSupportingScoreResult = {
      version: BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
      resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
      asOf: typeof asOf === "string" && asOf.trim() ? asOf : "1970-01-01T00:00:00.000Z",
      status: "unavailable",
      score: null,
      primaryReason,
      constructScores,
      constructReasons,
      evidenceScope: {
        mode: "caller_supplied_partial",
        accountEvidenceClaim: "scoped_to_supplied_evidence_only",
        completeness,
      },
      diagnostics: {
        engine: "performance_support",
        operation: "score_performance_supporting_composition",
        status: "unavailable",
        primaryReason,
        availableConstructCount,
        withheldConstructCount: 2 - availableConstructCount,
        safeNotes,
      },
    };
    if (version !== BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION) {
      return bodyCompositionPerformanceSupportingScoreResultSchema.parse({
        ...result,
        primaryReason: "invalid_provenance",
        diagnostics: {
          ...result.diagnostics,
          primaryReason: "invalid_provenance",
          safeNotes: [...safeNotes, "unsupported_performance_score_version"],
        },
      });
    }
    return bodyCompositionPerformanceSupportingScoreResultSchema.parse(result);
  };

  if (version !== BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION) {
    return fail(
      "invalid_provenance",
      {
        P1: emptyConstruct("invalid_provenance"),
        P3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["unsupported_performance_score_version"],
    );
  }

  if (
    input.resolverVersion != null &&
    input.resolverVersion !== BODY_COMPOSITION_RESOLVER_VERSION
  ) {
    return fail(
      "invalid_provenance",
      {
        P1: emptyConstruct("invalid_provenance"),
        P3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["unsupported_resolver_version"],
    );
  }

  const asOfMs = parseAsOfMs(asOf);
  if (asOfMs == null) {
    return fail(
      "invalid_provenance",
      {
        P1: emptyConstruct("invalid_provenance"),
        P3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["as_of_invalid"],
    );
  }

  if (!adultAgeOk(input.bundle.subjectContext.dateOfBirth, asOfMs)) {
    return fail(
      "required_age_missing",
      {
        P1: emptyConstruct("required_age_missing"),
        P3: emptyConstruct("required_age_missing"),
      },
      input.bundle.completeness,
      ["adult_age_gate_failed"],
    );
  }

  const parsedResolution = bodyCompositionEvidenceResolutionSchema.safeParse(input.resolution);
  if (!parsedResolution.success) {
    return fail(
      "invalid_provenance",
      {
        P1: emptyConstruct("invalid_provenance"),
        P3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["resolution_schema_invalid"],
    );
  }
  const resolution = parsedResolution.data;
  if (resolution.asOf !== asOf) {
    return fail(
      "invalid_provenance",
      {
        P1: emptyConstruct("invalid_provenance"),
        P3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["as_of_mismatch"],
    );
  }

  const sex = parseScoreSex(input.bundle.subjectContext.sexAtBirth);
  const subjectHeightCm = parseSubjectHeightCm(input.bundle.subjectContext.height);
  const byConstruct = Object.fromEntries(
    resolution.constructs.map((c) => [c.constructId, c]),
  ) as Record<string, (typeof resolution.constructs)[number]>;

  const p1 = evaluateP1({
    bundle: input.bundle,
    construct: byConstruct.P1 ?? null,
    asOfMs,
    sex,
    subjectHeightCm,
  });
  const p3 = evaluateP3({
    bundle: input.bundle,
    construct: byConstruct.P3 ?? null,
    asOfMs,
    sex,
    subjectHeightCm,
  });

  const constructScores = {
    P1: p1.result,
    P3: p3.result,
  };
  const constructReasons = constructReasonsFromScores(constructScores);
  const scoringInputs = mergeInputs([p1.scoringInputs, p3.scoringInputs]);

  const engineGate = engineMeasuredAtGate({
    measuredAtIntegrity: [p1.measuredAtIntegrity, p3.measuredAtIntegrity],
    inputs: scoringInputs,
    asOfMs,
  });
  if (engineGate) {
    return fail(engineGate, constructScores, input.bundle.completeness, [
      "engine_recency_or_era_gate",
      engineGate,
    ]);
  }

  if (p1.result.value == null || p3.result.value == null) {
    return fail("insufficient_core_constructs", constructScores, input.bundle.completeness, [
      "insufficient_core_constructs",
    ]);
  }

  const score = PerformanceSupporting_aggregate(p1.result.value, p3.result.value);
  if (score == null) {
    return fail("insufficient_core_constructs", constructScores, input.bundle.completeness, [
      "aggregate_non_finite",
    ]);
  }

  const result: BodyCompositionPerformanceSupportingScoreResult = {
    version: BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
    resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
    asOf,
    status: "calculated_internal_not_public",
    score,
    primaryReason: null,
    constructScores,
    constructReasons,
    evidenceScope: {
      mode: "caller_supplied_partial",
      accountEvidenceClaim: "scoped_to_supplied_evidence_only",
      completeness: input.bundle.completeness,
    },
    diagnostics: {
      engine: "performance_support",
      operation: "score_performance_supporting_composition",
      status: "calculated_internal_not_public",
      primaryReason: null,
      availableConstructCount: 2,
      withheldConstructCount: 0,
      safeNotes: ["internal_draft_not_public"],
    },
  };
  return bodyCompositionPerformanceSupportingScoreResultSchema.parse(result);
}

/**
 * Public-surface gate only — never replaces scientific calculation withholding.
 * This phase has no public exposure path; exported for contract completeness.
 */
export function publicReleaseNotAuthorizedReason(): BodyCompositionScoreReasonCode {
  return "public_release_not_authorized";
}
