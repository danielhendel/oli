/**
 * Mobile-facing Cardio IQ regression:
 * stale threshold projections from a prior candidate ID must not survive reprocess,
 * and Labs summary must select the equality current result.
 */
import { describe, expect, it } from "@jest/globals";
import type { LabExtractionDraft, LabResultCandidate } from "@oli/contracts";
import {
  formatLabResultValue,
  groupLabResultsByCategory,
} from "../../../../../../lib/labs/labMetricCatalog";
import { runLabAutoPublishAfterDraft } from "../runLabAutoPublishAfterDraft";
import { acceptedLabResultId, projectAcceptedToLabMetricResultDto } from "../labsReviewService";

const checksum = "c".repeat(64);
const iso = "2024-10-15T00:00:00.000Z";

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
          .map(([id, row]) => ({
            id,
            data: () => row,
          })),
      }),
    }),
  };
}

function candidate(args: {
  id: string;
  rawResult: string;
  result: LabResultCandidate["result"];
  page: number;
  sourceValueRole: NonNullable<LabResultCandidate["provenance"]["sourceValueRole"]>;
  resultRole?: LabResultCandidate["provenance"]["resultRole"];
}): LabResultCandidate {
  return {
    id: args.id,
    rawAnalyteLabel: "CHOLESTEROL, TOTAL",
    rawResult: args.rawResult,
    result: args.result,
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
      canonicalMetricId: "total_cholesterol",
      matchMethod: "exact_alias",
      aliasVersion: "1.2.0",
      confidence: 0.95,
      requiresReview: false,
    },
    provenance: {
      sourceDocumentId: "doc_cardio",
      sourcePage: args.page,
      sourceLocator: `p${args.page}:L1:CHOLESTEROL, TOTAL`,
      sourceChecksumSha256: checksum,
      parserId: "quest_text_pdf_v1",
      parserVersion: "1.2.0",
      extractionVersion: "1.2.0",
      panelName: "Cardio IQ®",
      resultRole: args.resultRole ?? "current",
      sourceValueRole: args.sourceValueRole,
    },
    confidence: 0.95,
    warnings: [],
    reviewStatus: "pending_review",
  };
}

function draftWith(results: LabResultCandidate[]): LabExtractionDraft {
  return {
    schemaVersion: "1.0.0",
    id: "draft_cardio",
    documentId: "doc_cardio",
    userId: "u1",
    reportCandidate: {
      confidence: 0.99,
      collectedAt: iso,
      reportedAt: iso,
      laboratoryName: "Quest Diagnostics",
      reportFamily: "quest_directlabs_text",
      formatFamilyVersion: "1.0.0",
      pageCount: 10,
    },
    panels: [],
    results,
    unmatched: [],
    warnings: [],
    status: "extracted",
    parser: { id: "quest_text_pdf_v1", version: "1.2.0", extractionVersion: "1.2.0" },
    sourceChecksumSha256: checksum,
    createdAt: iso,
  };
}

describe("Cardio IQ threshold projection reprocess (mobile summary path)", () => {
  it("removes stale threshold projections and surfaces equality current on summary", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();

    const thresholdCand = candidate({
      id: "cand_threshold_old",
      rawResult: "<200",
      result: { kind: "numeric", value: 200, comparator: "lt" },
      page: 6,
      sourceValueRole: "reference_optimal",
      resultRole: "summary",
    });
    // Simulate a prior buggy publish that projected the threshold as current.
    const staleAcceptedId = acceptedLabResultId("doc_cardio", thresholdCand.id);
    const staleProjection = projectAcceptedToLabMetricResultDto({
      schemaVersion: "1.0.0",
      id: staleAcceptedId,
      userId: "u1",
      sourceDocumentId: "doc_cardio",
      sourceExtractionId: "draft_old",
      sourceCandidateId: thresholdCand.id,
      canonicalMetricId: "total_cholesterol",
      rawAnalyteLabel: "CHOLESTEROL, TOTAL",
      panelId: null,
      collectedAt: iso,
      reportedAt: iso,
      fasting: null,
      result: { kind: "numeric", value: 200, comparator: "lt" },
      rawUnit: "mg/dL",
      normalizedUnit: "mg/dL",
      rawReferenceRange: null,
      structuredReferenceRange: null,
      rawFlag: null,
      normalizedFlag: "none",
      laboratory: { name: "Quest Diagnostics", code: null },
      method: null,
      provenance: {
        ...thresholdCand.provenance,
        // Corrupt prior role so old projection could exist.
        sourceValueRole: "current_result",
        resultRole: "current",
      },
      review: {
        status: "auto_published",
        acceptedAt: iso,
        reviewVersion: "0",
        policyVersion: "1.0.0",
        publicationMode: "auto",
      },
      parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
      createdAt: iso,
    });
    await accepted.doc(staleAcceptedId).set({
      sourceDocumentId: "doc_cardio",
      review: { status: "auto_published" },
      canonicalMetricId: "total_cholesterol",
    });
    await results.doc(staleAcceptedId).set(staleProjection as unknown as Record<string, unknown>);
    expect(results.store.has(staleAcceptedId)).toBe(true);

    const currentCand = candidate({
      id: "cand_current_detail",
      rawResult: "179",
      result: { kind: "numeric", value: 179, comparator: "eq" },
      page: 9,
      sourceValueRole: "current_result",
    });

    const out = await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftWith([currentCand]),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    });

    const currentAcceptedId = acceptedLabResultId("doc_cardio", currentCand.id);
    expect(out.projectedIds).toContain(currentAcceptedId);
    expect(out.removedStaleIds).toContain(staleAcceptedId);
    expect(accepted.store.has(staleAcceptedId)).toBe(false);
    expect(results.store.has(staleAcceptedId)).toBe(false);
    expect(results.store.has(currentAcceptedId)).toBe(true);

    const projectedRows = [...results.store.values()] as {
      id: string;
      metricKey: string;
      value: number | null;
      unit: string | null;
      rawValueText?: string | null;
      collectedAt?: string | null;
      sourcePage?: number;
      sourceValueRole?: string | null;
      panelName?: string | null;
      publicationMode?: "auto" | "user";
    }[];
    const grouped = groupLabResultsByCategory(
      projectedRows.map((r) => ({
        id: r.id,
        metricKey: r.metricKey,
        value: r.value,
        unit: r.unit,
        rawValueText: r.rawValueText ?? null,
        collectedAt: r.collectedAt ?? null,
        sourcePage: r.sourcePage,
        sourceValueRole: r.sourceValueRole ?? null,
        panelName: r.panelName ?? null,
        publicationMode: r.publicationMode ?? null,
      })),
    );
    const card = grouped
      .flatMap((g) => g.metrics)
      .find((m) => m.definition.metricKey === "total_cholesterol")?.latest;
    expect(card).toBeTruthy();
    const display = formatLabResultValue(card!.value, card!.unit, {
      rawValueText: card!.rawValueText,
    });
    expect(display).toBe("179 mg/dL");
    expect(display.startsWith("<")).toBe(false);
  });

  it("never projects Cardio IQ reference_optimal rows", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();
    const thresholdCand = candidate({
      id: "cand_ref",
      rawResult: "<200",
      result: { kind: "numeric", value: 200, comparator: "lt" },
      page: 6,
      sourceValueRole: "reference_optimal",
      resultRole: "summary",
    });
    // Force into results list as if resolution failed to demote — guard must still block.
    const out = await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftWith([thresholdCand]),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    });
    // Auto-publish policy may withhold; either way projection store must stay empty for this metric.
    const projected = [...results.store.values()].filter(
      (r) => (r as { metricKey?: string }).metricKey === "total_cholesterol",
    );
    expect(projected).toHaveLength(0);
    expect(out.projectedIds).toHaveLength(0);
  });

  it("preserves user-corrected accepted rows across reprocess cleanup", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();
    const userId = acceptedLabResultId("doc_cardio", "cand_user");
    await accepted.doc(userId).set({
      sourceDocumentId: "doc_cardio",
      review: { status: "user_corrected" },
      canonicalMetricId: "total_cholesterol",
    });
    await results.doc(userId).set({
      schemaVersion: 2,
      id: userId,
      uploadId: "doc_cardio",
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      categoryKey: "cardiovascular",
      value: 188,
      unit: "mg/dL",
      rawValueText: "188",
      source: "lab_pdf",
      confidence: 1,
      rawName: "CHOLESTEROL, TOTAL",
      createdAt: iso,
      collectedAt: iso,
    });

    const currentCand = candidate({
      id: "cand_current_detail",
      rawResult: "179",
      result: { kind: "numeric", value: 179, comparator: "eq" },
      page: 9,
      sourceValueRole: "current_result",
    });
    const prior = {
      schemaVersion: "1.0.0" as const,
      id: "review_doc_cardio",
      documentId: "doc_cardio",
      userId: "u1",
      draftId: "draft_old",
      status: "imported" as const,
      reviewVersion: 1,
      candidateStatuses: { cand_user: "user_corrected" as const },
      corrections: [],
      createdAt: iso,
      updatedAt: iso,
    };

    await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftWith([currentCand]),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
      priorReview: prior,
    });

    expect(accepted.store.has(userId)).toBe(true);
    expect(results.store.has(userId)).toBe(true);
  });
});
