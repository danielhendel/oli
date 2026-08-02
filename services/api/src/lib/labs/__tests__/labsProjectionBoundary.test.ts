/**
 * Projection boundary for accepted Labs results → legacy v2 summary rows.
 *
 * Intentional Phase 3D-A rule:
 * - Only numeric equality results project into LabMetricResultDto (schemaVersion 2).
 * - Inequalities, qualitative, pattern, text, and not_reported stay in labAcceptedResults.
 * - Unmatched / rejected / unresolved never project.
 *
 * Labs home categories currently read v2 rows; accepted non-numeric history is available
 * via labAcceptedResults / review surfaces until a dedicated accepted-results summary ships.
 */

import {
  acceptedLabResultId,
  projectAcceptedToLabMetricResultDto,
  resolveCandidatesForAccept,
} from "../labsReviewService";
import type {
  AcceptedLabResult,
  LabExtractionDraft,
  LabResultCandidate,
  LabReviewRecord,
} from "@oli/contracts";

const checksum = "c".repeat(64);
const iso = "2024-03-15T12:00:00.000Z";

function baseProvenance(candidateId: string) {
  return {
    sourceDocumentId: "doc1",
    sourcePage: 1,
    sourceLocator: `p1:L1:${candidateId}`,
    sourceChecksumSha256: checksum,
    parserId: "quest_text_pdf_v1",
    parserVersion: "1.0.0",
    extractionVersion: "1.0.0",
  };
}

function candidate(partial: Partial<LabResultCandidate> & Pick<LabResultCandidate, "id" | "rawAnalyteLabel" | "rawResult" | "result">): LabResultCandidate {
  return {
    unit: {
      rawUnit: "mg/dL",
      normalizedUnit: "mg/dL",
      unitRegistryVersion: "1.0.0",
      confidence: 1,
      known: true,
    },
    rawReferenceRange: "<100",
    structuredReferenceRange: null,
    flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
    panelId: null,
    aliasMatch: {
      canonicalMetricId: "ldl_c",
      matchMethod: "exact_alias",
      aliasVersion: "1.0.0",
      confidence: 0.95,
      requiresReview: false,
    },
    provenance: baseProvenance(partial.id),
    confidence: 0.95,
    warnings: [],
    reviewStatus: "user_accepted",
    ...partial,
  };
}

function acceptedFrom(c: LabResultCandidate, result: AcceptedLabResult["result"]): AcceptedLabResult {
  return {
    schemaVersion: "1.0.0",
    id: acceptedLabResultId("doc1", c.id),
    userId: "u1",
    sourceDocumentId: "doc1",
    sourceExtractionId: "draft1",
    sourceCandidateId: c.id,
    canonicalMetricId: c.aliasMatch.canonicalMetricId,
    rawAnalyteLabel: c.rawAnalyteLabel,
    panelId: null,
    collectedAt: iso,
    reportedAt: iso,
    fasting: true,
    result,
    rawUnit: c.unit.rawUnit,
    normalizedUnit: c.unit.normalizedUnit,
    rawReferenceRange: c.rawReferenceRange,
    structuredReferenceRange: null,
    rawFlag: null,
    normalizedFlag: "none",
    laboratory: null,
    method: null,
    provenance: c.provenance,
    review: { status: "user_accepted", acceptedAt: iso, reviewVersion: "1" },
    parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
    createdAt: iso,
  };
}

describe("labs projection boundary", () => {
  it("projects numeric equality into v2 rows", () => {
    const c = candidate({
      id: "c_eq",
      rawAnalyteLabel: "LDL-C",
      rawResult: "98",
      result: { kind: "numeric", value: 98, comparator: "eq" },
    });
    const projected = projectAcceptedToLabMetricResultDto(acceptedFrom(c, c.result!));
    expect(projected).not.toBeNull();
    expect(projected?.value).toBe(98);
    expect(projected?.metricKey).toBe("ldl_c");
    expect(projected?.uploadId).toBe("doc1");
  });

  it("does not project inequalities into v2 numeric summary", () => {
    const c = candidate({
      id: "c_lt",
      rawAnalyteLabel: "Lp(a)",
      rawResult: "<4",
      result: { kind: "numeric", value: 4, comparator: "lt" },
      aliasMatch: {
        canonicalMetricId: "lpa",
        matchMethod: "exact_alias",
        aliasVersion: "1.0.0",
        confidence: 0.95,
        requiresReview: false,
      },
    });
    expect(projectAcceptedToLabMetricResultDto(acceptedFrom(c, c.result!))).toBeNull();
  });

  it("does not project qualitative or pattern results", () => {
    const q = candidate({
      id: "c_q",
      rawAnalyteLabel: "HCV AB",
      rawResult: "NEGATIVE",
      result: { kind: "qualitative", value: "negative", rawValue: "NEGATIVE" },
      aliasMatch: {
        canonicalMetricId: null,
        matchMethod: "unmatched",
        aliasVersion: "1.0.0",
        confidence: 0.2,
        requiresReview: true,
      },
    });
    expect(
      projectAcceptedToLabMetricResultDto(
        acceptedFrom(
          { ...q, aliasMatch: { ...q.aliasMatch, canonicalMetricId: "hs_crp" } },
          q.result!,
        ),
      ),
    ).toBeNull();

    const p = candidate({
      id: "c_p",
      rawAnalyteLabel: "ANA",
      rawResult: "Pattern B",
      result: { kind: "pattern", value: "Pattern B" },
    });
    expect(projectAcceptedToLabMetricResultDto(acceptedFrom(p, p.result!))).toBeNull();
  });

  it("uses deterministic accepted ids for idempotent writes", () => {
    expect(acceptedLabResultId("doc1", "candA")).toBe("acc_doc1_candA");
    expect(acceptedLabResultId("doc1", "candA")).toBe(acceptedLabResultId("doc1", "candA"));
  });

  it("resolveCandidatesForAccept skips rejected and unmatched", () => {
    const draft = {
      schemaVersion: "1.0.0",
      id: "draft1",
      documentId: "doc1",
      userId: "u1",
      reportCandidate: { confidence: 1 },
      panels: [],
      results: [
        candidate({
          id: "ok",
          rawAnalyteLabel: "LDL",
          rawResult: "100",
          result: { kind: "numeric", value: 100, comparator: "eq" },
          reviewStatus: "user_accepted",
        }),
        candidate({
          id: "rej",
          rawAnalyteLabel: "HDL",
          rawResult: "50",
          result: { kind: "numeric", value: 50, comparator: "eq" },
          reviewStatus: "rejected",
        }),
      ],
      unmatched: [
        {
          id: "um",
          rawAnalyteLabel: "UNKNOWN",
          rawResult: "1",
          reason: "unmatched_alias" as const,
          provenance: baseProvenance("um"),
          confidence: 0.2,
          reviewStatus: "pending_review" as const,
        },
      ],
      warnings: [],
      parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
      sourceChecksumSha256: checksum,
      status: "review_needed" as const,
      createdAt: iso,
    } satisfies LabExtractionDraft;

    const review = {
      schemaVersion: "1.0.0",
      id: "review_doc1",
      documentId: "doc1",
      userId: "u1",
      draftId: "draft1",
      status: "in_progress" as const,
      reviewVersion: 1,
      candidateStatuses: { ok: "user_accepted" as const, rej: "rejected" as const, um: "pending_review" as const },
      corrections: [],
      createdAt: iso,
      updatedAt: iso,
    } satisfies LabReviewRecord;

    const resolved = resolveCandidatesForAccept({
      draft,
      review,
      candidateIds: ["ok", "rej", "um"],
    });
    expect(resolved.accepted.map((c) => c.id)).toEqual(["ok"]);
    expect(resolved.skippedUnresolved).toContain("um");
  });
});
