/**
 * Auto-publish orchestration: idempotent publish + preserve user overrides.
 */
import { describe, expect, it } from "@jest/globals";
import type { LabExtractionDraft, LabReviewRecord } from "@oli/contracts";
import { LAB_AUTO_IMPORT_POLICY_VERSION } from "@oli/contracts";
import { runLabAutoPublishAfterDraft } from "../runLabAutoPublishAfterDraft";
import { acceptedLabResultId } from "../labsReviewService";

const checksum = "b".repeat(64);
const iso = "2024-06-01T12:00:00.000Z";

function makeCol() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    store,
    doc: (id: string) => ({
      set: async (data: Record<string, unknown>) => {
        store.set(id, { ...(store.get(id) ?? {}), ...data });
      },
      get: async () => ({
        exists: store.has(id),
        data: () => store.get(id),
      }),
      delete: async () => {
        store.delete(id);
      },
    }),
    where: (field: string, _op: string, value: unknown) => ({
      get: async () => ({
        docs: [...store.entries()]
          .filter(([, row]) => row[field] === value)
          .map(([id, row]) => ({ id, data: () => row })),
      }),
    }),
  };
}

function draftFixture(): LabExtractionDraft {
  return {
    schemaVersion: "1.0.0",
    id: "draft1",
    documentId: "doc1",
    userId: "u1",
    reportCandidate: {
      confidence: 0.99,
      collectedAt: iso,
      reportedAt: iso,
      laboratoryName: "Quest Diagnostics",
      reportFamily: "quest_directlabs_text",
      formatFamilyVersion: "1.0.0",
      pageCount: 1,
    },
    panels: [],
    results: [
      {
        id: "ok",
        rawAnalyteLabel: "LDL-CHOLESTEROL",
        rawResult: "98",
        result: { kind: "numeric", value: 98, comparator: "eq" },
        unit: {
          rawUnit: "mg/dL",
          normalizedUnit: "mg/dL",
          unitRegistryVersion: "1.1.0",
          confidence: 0.99,
          known: true,
        },
        rawReferenceRange: "<100",
        structuredReferenceRange: null,
        flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
        panelId: null,
        aliasMatch: {
          canonicalMetricId: "ldl_c",
          matchMethod: "exact_alias",
          aliasVersion: "1.1.0",
          confidence: 0.95,
          requiresReview: false,
        },
        provenance: {
          sourceDocumentId: "doc1",
          sourcePage: 1,
          sourceLocator: "p1:L1",
          sourceChecksumSha256: checksum,
          parserId: "quest_text_pdf_v1",
          parserVersion: "1.1.0",
          extractionVersion: "1.1.0",
          resultRole: "current",
        },
        confidence: 0.95,
        warnings: [],
        reviewStatus: "pending_review",
      },
      {
        id: "ineq",
        rawAnalyteLabel: "LDL-CHOLESTEROL",
        rawResult: "<4",
        result: { kind: "numeric", value: 4, comparator: "lt" },
        unit: {
          rawUnit: "mg/dL",
          normalizedUnit: "mg/dL",
          unitRegistryVersion: "1.1.0",
          confidence: 0.99,
          known: true,
        },
        rawReferenceRange: null,
        structuredReferenceRange: null,
        flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
        panelId: null,
        aliasMatch: {
          canonicalMetricId: "ldl_c",
          matchMethod: "exact_alias",
          aliasVersion: "1.1.0",
          confidence: 0.95,
          requiresReview: false,
        },
        provenance: {
          sourceDocumentId: "doc1",
          sourcePage: 1,
          sourceLocator: "p1:L2",
          sourceChecksumSha256: checksum,
          parserId: "quest_text_pdf_v1",
          parserVersion: "1.1.0",
          extractionVersion: "1.1.0",
          resultRole: "current",
        },
        confidence: 0.9,
        warnings: [],
        reviewStatus: "pending_review",
      },
    ],
    unmatched: [
      {
        id: "um1",
        rawAnalyteLabel: "MYSTERY",
        rawResult: "1",
        reason: "unmatched_alias",
        provenance: {
          sourceDocumentId: "doc1",
          sourcePage: 1,
          sourceLocator: "p1:L3",
          sourceChecksumSha256: checksum,
          parserId: "quest_text_pdf_v1",
          parserVersion: "1.1.0",
          extractionVersion: "1.1.0",
        },
        confidence: 0.4,
        reviewStatus: "unresolved",
      },
    ],
    warnings: [],
    parser: { id: "quest_text_pdf_v1", version: "1.1.0", extractionVersion: "1.1.0" },
    sourceChecksumSha256: checksum,
    status: "review_needed",
    createdAt: iso,
  };
}

describe("runLabAutoPublishAfterDraft", () => {
  it("auto-publishes eligible candidates and leaves ineligible pending", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();
    const out = await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftFixture(),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    });
    expect(out.importSummary.importedCount).toBe(2);
    expect(out.importSummary.reviewNeededCount).toBe(0);
    expect(out.importSummary.unmatchedCount).toBe(1);
    expect(out.importSummary.policyVersion).toBe(LAB_AUTO_IMPORT_POLICY_VERSION);
    expect(out.review.candidateStatuses.ok).toBe("auto_published");
    expect(out.review.candidateStatuses.ineq).toBe("auto_published");
    expect(out.review.candidateStatuses.um1).toBe("unresolved");
    expect(accepted.store.has(acceptedLabResultId("doc1", "ok"))).toBe(true);
    expect(accepted.store.has(acceptedLabResultId("doc1", "ineq"))).toBe(true);
    expect(results.store.has(acceptedLabResultId("doc1", "ok"))).toBe(true);
    expect(results.store.has(acceptedLabResultId("doc1", "ineq"))).toBe(true);
  });

  it("is idempotent on repeated execution", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();
    const args = {
      uid: "u1",
      draft: draftFixture(),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    };
    const first = await runLabAutoPublishAfterDraft(args);
    const second = await runLabAutoPublishAfterDraft({
      ...args,
      priorReview: first.review,
    });
    expect(second.acceptedIds).toEqual(first.acceptedIds);
    expect(accepted.store.size).toBe(2);
    expect(results.store.size).toBe(2);
  });

  it("preserves rejected overrides and removes projections on reprocess", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();
    const first = await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftFixture(),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    });
    const prior: LabReviewRecord = {
      ...first.review,
      candidateStatuses: { ...first.review.candidateStatuses, ok: "rejected" },
    };
    const second = await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftFixture(),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
      priorReview: prior,
    });
    expect(second.review.candidateStatuses.ok).toBe("rejected");
    expect(accepted.store.has(acceptedLabResultId("doc1", "ok"))).toBe(false);
    expect(results.store.has(acceptedLabResultId("doc1", "ok"))).toBe(false);
  });
});
