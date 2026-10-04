/**
 * Body Composition Dual Score contract schemas and version constants.
 */
import { describe, expect, it } from "@jest/globals";

import { BODY_COMPOSITION_RESOLVER_VERSION } from "../bodyCompositionEvidenceResolver";
import {
  BODY_COMPOSITION_HEALTH_SCORE_PUBLIC_STATUS,
  BODY_COMPOSITION_HEALTH_SCORE_VERSION,
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_PUBLIC_STATUS,
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
  BODY_COMPOSITION_SCORE_REASON_CODES,
  bodyCompositionHealthScoreResultSchema,
  bodyCompositionPerformanceSupportingScoreResultSchema,
  bodyCompositionScoreConstructResultSchema,
  type BodyCompositionHealthScoreResult,
} from "../bodyCompositionScores";

const AS_OF = "2026-06-01T00:00:00.000Z";

function baseHealthResult(
  overrides: Partial<BodyCompositionHealthScoreResult> = {},
): BodyCompositionHealthScoreResult {
  return {
    version: BODY_COMPOSITION_HEALTH_SCORE_VERSION,
    resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
    asOf: AS_OF,
    status: "calculated_internal_not_public",
    score: 80,
    primaryReason: null,
    constructScores: {
      H1: { value: 90, primaryReason: null },
      H2: { value: 85, primaryReason: null },
      H3: { value: 70, primaryReason: null },
    },
    constructReasons: {},
    evidenceScope: {
      mode: "caller_supplied_partial",
      accountEvidenceClaim: "scoped_to_supplied_evidence_only",
      completeness: {
        mode: "caller_supplied_partial",
        profile: "available",
        continuousEvents: "provided_nonempty",
        verifiedScanDetails: "provided_nonempty",
      },
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
    ...overrides,
  };
}

describe("bodyCompositionScores contracts", () => {
  it("exposes exact internal draft version constants", () => {
    expect(BODY_COMPOSITION_HEALTH_SCORE_VERSION).toBe(
      "body_composition_health_score_draft_v1",
    );
    expect(BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION).toBe(
      "body_composition_performance_supporting_score_draft_v1",
    );
  });

  it("lists canonical reason codes in freeze order", () => {
    expect(BODY_COMPOSITION_SCORE_REASON_CODES).toEqual([
      "invalid_provenance",
      "future_evidence",
      "evidence_too_old",
      "evidence_era_mismatch",
      "required_age_missing",
      "required_sex_missing",
      "required_height_missing",
      "unsupported_method",
      "conflict_unresolved",
      "policy_not_frozen",
      "multiple_valid_unfrozen",
      "unresolved_construct",
      "p1_ffmi_not_resolved",
      "incomplete_health_composition",
      "insufficient_core_constructs",
      "public_release_not_authorized",
    ]);
  });

  it("parses available construct and aggregate shapes", () => {
    const parsed = bodyCompositionHealthScoreResultSchema.parse(baseHealthResult());
    expect(parsed.constructScores.H1).toEqual({ value: 90, primaryReason: null });
    expect(parsed.score).toBe(80);
    expect(parsed.primaryReason).toBeNull();
  });

  it("parses withheld construct and unavailable aggregate shapes", () => {
    const parsed = bodyCompositionHealthScoreResultSchema.parse(
      baseHealthResult({
        status: "unavailable",
        score: null,
        primaryReason: "incomplete_health_composition",
        constructScores: {
          H1: { value: 90, primaryReason: null },
          H2: { value: null, primaryReason: "unsupported_method" },
          H3: { value: 70, primaryReason: null },
        },
        constructReasons: { H2: "unsupported_method" },
        diagnostics: {
          engine: "health",
          operation: "score_health_composition",
          status: "unavailable",
          primaryReason: "incomplete_health_composition",
          availableConstructCount: 2,
          withheldConstructCount: 1,
          safeNotes: ["incomplete_health_composition"],
        },
      }),
    );
    expect(parsed.constructScores.H2.value).toBeNull();
    expect(parsed.constructReasons.H2).toBe("unsupported_method");
  });

  it("preserves constructReasons only for withheld constructs", () => {
    const parsed = bodyCompositionHealthScoreResultSchema.parse(
      baseHealthResult({
        status: "unavailable",
        score: null,
        primaryReason: "incomplete_health_composition",
        constructScores: {
          H1: { value: null, primaryReason: "future_evidence" },
          H2: { value: 85, primaryReason: null },
          H3: { value: null, primaryReason: "required_sex_missing" },
        },
        constructReasons: {
          H1: "future_evidence",
          H3: "required_sex_missing",
        },
      }),
    );
    expect(parsed.constructReasons).toEqual({
      H1: "future_evidence",
      H3: "required_sex_missing",
    });
    expect(parsed.constructReasons.H2).toBeUndefined();
  });

  it("rejects unsupported health score version strings", () => {
    expect(() =>
      bodyCompositionHealthScoreResultSchema.parse(
        baseHealthResult({
          version: "body_composition_health_score_draft_v2" as typeof BODY_COMPOSITION_HEALTH_SCORE_VERSION,
        }),
      ),
    ).toThrow();
  });

  it("forbids score 0 as missing — withheld uses null value", () => {
    expect(() =>
      bodyCompositionScoreConstructResultSchema.parse({
        value: 0,
        primaryReason: "invalid_provenance",
      }),
    ).toThrow();
    expect(() =>
      bodyCompositionHealthScoreResultSchema.parse(
        baseHealthResult({
          status: "unavailable",
          score: 0,
          primaryReason: "incomplete_health_composition",
        }),
      ),
    ).toThrow();
  });

  it("exposes public NO-GO constants for both engines", () => {
    expect(BODY_COMPOSITION_HEALTH_SCORE_PUBLIC_STATUS).toBe("NO-GO");
    expect(BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_PUBLIC_STATUS).toBe("NO-GO");
  });

  it("parses performance supporting result schema", () => {
    const parsed = bodyCompositionPerformanceSupportingScoreResultSchema.parse({
      version: BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
      resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
      asOf: AS_OF,
      status: "unavailable",
      score: null,
      primaryReason: "insufficient_core_constructs",
      constructScores: {
        P1: { value: null, primaryReason: "p1_ffmi_not_resolved" },
        P3: { value: 80, primaryReason: null },
      },
      constructReasons: { P1: "p1_ffmi_not_resolved" },
      evidenceScope: {
        mode: "caller_supplied_partial",
        accountEvidenceClaim: "scoped_to_supplied_evidence_only",
        completeness: {
          mode: "caller_supplied_partial",
          profile: "missing",
          continuousEvents: "omitted",
          verifiedScanDetails: "omitted",
        },
      },
      diagnostics: {
        engine: "performance_support",
        operation: "score_performance_supporting_composition",
        status: "unavailable",
        primaryReason: "insufficient_core_constructs",
        availableConstructCount: 1,
        withheldConstructCount: 1,
        safeNotes: ["insufficient_core_constructs"],
      },
    });
    expect(parsed.constructReasons.P1).toBe("p1_ffmi_not_resolved");
  });
});
