/**
 * Health Composition internal draft score engine.
 *
 * version: body_composition_health_score_draft_v1
 *
 * Pure domain. No Firebase, network, React, AsyncStorage, Date.now(),
 * persistence, API, or consumer UI.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionHealthScoreResult,
  BodyCompositionScoreReasonCode,
} from "@oli/contracts";
import {
  BODY_COMPOSITION_HEALTH_SCORE_VERSION,
  BODY_COMPOSITION_RESOLVER_VERSION,
  bodyCompositionEvidenceResolutionSchema,
  bodyCompositionHealthScoreResultSchema,
} from "@oli/contracts";

import { adultAgeOk } from "./age";
import { parseScoreSex, parseSubjectHeightCm } from "./demographics";
import {
  constructReasonsFromScores,
  evaluateH1,
  evaluateH2,
  evaluateH3,
  type MeasuredAtIntegrity,
} from "./evaluateConstruct";
import {
  eraGapMs,
  measuredAtReason,
  parseAsOfMs,
  type ScoringTimestampInput,
} from "./recency";
import { MAX_SCORE_CONSTRUCT_GAP_MS } from "./constants";
import { Health_aggregate } from "./transforms";

export type ScoreHealthCompositionInput = {
  bundle: BodyCompositionEvidenceBundle;
  /** Approved Resolver output — score must not mutate or re-select evidence. */
  resolution: unknown;
  /** Explicit evaluation instant — never Date.now(). */
  asOf: string;
  healthScoreVersion?: typeof BODY_COMPOSITION_HEALTH_SCORE_VERSION;
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
  // Rank 3 — required scoring input missing/malformed/non-finite measuredAt
  if (args.measuredAtIntegrity.includes("invalid")) {
    return "invalid_provenance";
  }
  // Rank 4
  for (const input of args.inputs) {
    const r = measuredAtReason(input.measuredAtMs, args.asOfMs);
    if (r === "future_evidence") return "future_evidence";
  }
  // Rank 5
  for (const input of args.inputs) {
    const r = measuredAtReason(input.measuredAtMs, args.asOfMs);
    if (r === "evidence_too_old") return "evidence_too_old";
  }
  // Rank 6
  if (args.inputs.length >= 2 && eraGapMs(args.inputs) > MAX_SCORE_CONSTRUCT_GAP_MS) {
    return "evidence_era_mismatch";
  }
  return null;
}

/**
 * Compute internal Health Composition draft score.
 * Public release remains NO-GO.
 */
export function scoreHealthComposition(
  input: ScoreHealthCompositionInput,
): BodyCompositionHealthScoreResult {
  const version = input.healthScoreVersion ?? BODY_COMPOSITION_HEALTH_SCORE_VERSION;
  const asOf = input.asOf;

  const fail = (
    primaryReason: BodyCompositionScoreReasonCode,
    constructScores: BodyCompositionHealthScoreResult["constructScores"],
    completeness: BodyCompositionEvidenceBundle["completeness"],
    safeNotes: string[],
  ): BodyCompositionHealthScoreResult => {
    const constructReasons = constructReasonsFromScores(constructScores);
    const availableConstructCount = [constructScores.H1, constructScores.H2, constructScores.H3].filter(
      (c) => c.value != null,
    ).length;
    const result: BodyCompositionHealthScoreResult = {
      version: BODY_COMPOSITION_HEALTH_SCORE_VERSION,
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
        engine: "health",
        operation: "score_health_composition",
        status: "unavailable",
        primaryReason,
        availableConstructCount,
        withheldConstructCount: 3 - availableConstructCount,
        safeNotes,
      },
    };
    // Preserve requested version only when it matches frozen constant.
    if (version !== BODY_COMPOSITION_HEALTH_SCORE_VERSION) {
      return bodyCompositionHealthScoreResultSchema.parse({
        ...result,
        primaryReason: "invalid_provenance",
        diagnostics: {
          ...result.diagnostics,
          primaryReason: "invalid_provenance",
          safeNotes: [...safeNotes, "unsupported_health_score_version"],
        },
      });
    }
    return bodyCompositionHealthScoreResultSchema.parse(result);
  };

  if (version !== BODY_COMPOSITION_HEALTH_SCORE_VERSION) {
    return fail(
      "invalid_provenance",
      {
        H1: emptyConstruct("invalid_provenance"),
        H2: emptyConstruct("invalid_provenance"),
        H3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["unsupported_health_score_version"],
    );
  }

  if (
    input.resolverVersion != null &&
    input.resolverVersion !== BODY_COMPOSITION_RESOLVER_VERSION
  ) {
    return fail(
      "invalid_provenance",
      {
        H1: emptyConstruct("invalid_provenance"),
        H2: emptyConstruct("invalid_provenance"),
        H3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["unsupported_resolver_version"],
    );
  }

  // §4.2 rank 1 — asOf
  const asOfMs = parseAsOfMs(asOf);
  if (asOfMs == null) {
    return fail(
      "invalid_provenance",
      {
        H1: emptyConstruct("invalid_provenance"),
        H2: emptyConstruct("invalid_provenance"),
        H3: emptyConstruct("invalid_provenance"),
      },
      input.bundle.completeness,
      ["as_of_invalid"],
    );
  }

  // §4.2 rank 2 — adult age
  if (!adultAgeOk(input.bundle.subjectContext.dateOfBirth, asOfMs)) {
    return fail(
      "required_age_missing",
      {
        H1: emptyConstruct("required_age_missing"),
        H2: emptyConstruct("required_age_missing"),
        H3: emptyConstruct("required_age_missing"),
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
        H1: emptyConstruct("invalid_provenance"),
        H2: emptyConstruct("invalid_provenance"),
        H3: emptyConstruct("invalid_provenance"),
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
        H1: emptyConstruct("invalid_provenance"),
        H2: emptyConstruct("invalid_provenance"),
        H3: emptyConstruct("invalid_provenance"),
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

  const h1 = evaluateH1({
    bundle: input.bundle,
    construct: byConstruct.H1 ?? null,
    asOfMs,
    sex,
    subjectHeightCm,
  });
  const h2 = evaluateH2({
    bundle: input.bundle,
    construct: byConstruct.H2 ?? null,
    asOfMs,
    sex,
    subjectHeightCm,
  });
  const h3 = evaluateH3({
    bundle: input.bundle,
    construct: byConstruct.H3 ?? null,
    asOfMs,
    sex,
    subjectHeightCm,
  });

  const constructScores = {
    H1: h1.result,
    H2: h2.result,
    H3: h3.result,
  };
  const constructReasons = constructReasonsFromScores(constructScores);
  const scoringInputs = mergeInputs([h1.scoringInputs, h2.scoringInputs, h3.scoringInputs]);

  // §4.2 ranks 3–6 on aggregate scoring input set
  const engineGate = engineMeasuredAtGate({
    measuredAtIntegrity: [
      h1.measuredAtIntegrity,
      h2.measuredAtIntegrity,
      h3.measuredAtIntegrity,
    ],
    inputs: scoringInputs,
    asOfMs,
  });
  if (engineGate) {
    return fail(engineGate, constructScores, input.bundle.completeness, [
      "engine_recency_or_era_gate",
      engineGate,
    ]);
  }

  // §4.2 rank 7 — incomplete cores
  if (h1.result.value == null || h2.result.value == null || h3.result.value == null) {
    return fail("incomplete_health_composition", constructScores, input.bundle.completeness, [
      "incomplete_health_composition",
    ]);
  }

  const score = Health_aggregate(h1.result.value, h2.result.value, h3.result.value);
  if (score == null) {
    return fail("incomplete_health_composition", constructScores, input.bundle.completeness, [
      "aggregate_non_finite",
    ]);
  }

  const result: BodyCompositionHealthScoreResult = {
    version: BODY_COMPOSITION_HEALTH_SCORE_VERSION,
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
      engine: "health",
      operation: "score_health_composition",
      status: "calculated_internal_not_public",
      primaryReason: null,
      availableConstructCount: 3,
      withheldConstructCount: 0,
      safeNotes: ["internal_draft_not_public"],
    },
  };
  return bodyCompositionHealthScoreResultSchema.parse(result);
}
