/**
 * Extended reprocess cleanup for remaining source-to-display defects (synthetic).
 */
import { describe, expect, it } from "@jest/globals";
import type { LabExtractionDraft, LabResultCandidate } from "@oli/contracts";
import {
  formatLabResultValue,
  groupLabResultsByCategory,
} from "../../../../../../lib/labs/labMetricCatalog";
import { runLabAutoPublishAfterDraft } from "../runLabAutoPublishAfterDraft";
import { acceptedLabResultId, projectAcceptedToLabMetricResultDto } from "../labsReviewService";

const checksum = "d".repeat(64);
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

function cand(args: {
  id: string;
  metricId: string;
  label: string;
  rawResult: string;
  result: LabResultCandidate["result"];
  page: number;
  sourceValueRole: NonNullable<LabResultCandidate["provenance"]["sourceValueRole"]>;
  unit?: string;
  panelName?: string;
}): LabResultCandidate {
  return {
    id: args.id,
    rawAnalyteLabel: args.label,
    rawResult: args.rawResult,
    result: args.result,
    unit: {
      rawUnit: args.unit ?? "mg/dL",
      normalizedUnit: args.unit ?? "mg/dL",
      unitRegistryVersion: "1.1.0",
      confidence: 0.99,
      known: true,
    },
    rawReferenceRange: null,
    structuredReferenceRange: null,
    flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
    panelId: null,
    aliasMatch: {
      canonicalMetricId: args.metricId,
      matchMethod: "exact_alias",
      aliasVersion: "1.2.0",
      confidence: 0.95,
      requiresReview: false,
    },
    provenance: {
      sourceDocumentId: "doc_final",
      sourcePage: args.page,
      sourceLocator: `p${args.page}:L0:${args.label.slice(0, 12)}`,
      sourceChecksumSha256: checksum,
      parserId: "quest_text_pdf_v1",
      parserVersion: "1.2.0",
      extractionVersion: "1.2.0",
      panelName: args.panelName ?? "Cardio IQ®",
      resultRole: "current",
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
    id: "draft_final",
    documentId: "doc_final",
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

async function seedStaleThreshold(args: {
  accepted: ReturnType<typeof makeCol>;
  results: ReturnType<typeof makeCol>;
  candidateId: string;
  metricId: string;
  label: string;
  rawValueText: string;
  value: number;
  unit: string;
  page?: number;
}) {
  const id = acceptedLabResultId("doc_final", args.candidateId);
  const projection = projectAcceptedToLabMetricResultDto({
    schemaVersion: "1.0.0",
    id,
    userId: "u1",
    sourceDocumentId: "doc_final",
    sourceExtractionId: "draft_old",
    sourceCandidateId: args.candidateId,
    canonicalMetricId: args.metricId,
    rawAnalyteLabel: args.label,
    panelId: null,
    collectedAt: iso,
    reportedAt: iso,
    fasting: null,
    result: { kind: "numeric", value: args.value, comparator: "lt" },
    rawUnit: args.unit,
    normalizedUnit: args.unit,
    rawReferenceRange: null,
    structuredReferenceRange: null,
    rawFlag: null,
    normalizedFlag: "none",
    laboratory: { name: "Quest Diagnostics", code: null },
    method: null,
    provenance: {
      sourceDocumentId: "doc_final",
      sourcePage: args.page ?? 6,
      sourceLocator: `p6:L0:${args.label.slice(0, 12)}`,
      sourceChecksumSha256: checksum,
      parserId: "quest_text_pdf_v1",
      parserVersion: "1.0.0",
      extractionVersion: "1.0.0",
      panelName: "Cardio IQ®",
      resultRole: "current",
      sourceValueRole: "current_result",
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
  // Force threshold raw text onto projection (simulates prior buggy publish).
  const row = { ...(projection as Record<string, unknown>), rawValueText: args.rawValueText };
  await args.accepted.doc(id).set({
    sourceDocumentId: "doc_final",
    review: { status: "auto_published" },
    canonicalMetricId: args.metricId,
  });
  await args.results.doc(id).set(row);
  return id;
}

describe("final source-display reprocess cleanup", () => {
  it("removes stale Cardio IQ thresholds and surfaces detail equality currents", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();

    const staleIds = await Promise.all([
      seedStaleThreshold({
        accepted,
        results,
        candidateId: "old_nh",
        metricId: "non_hdl_c",
        label: "NON-HDL CHOLESTEROL",
        rawValueText: "<130",
        value: 130,
        unit: "mg/dL",
      }),
      seedStaleThreshold({
        accepted,
        results,
        candidateId: "old_med",
        metricId: "ldl_medium",
        label: "LDL MEDIUM",
        rawValueText: "<215",
        value: 215,
        unit: "nmol/L",
      }),
      seedStaleThreshold({
        accepted,
        results,
        candidateId: "old_osmo",
        metricId: "osmolality_serum",
        label: "OSMOLALITY",
        rawValueText: "222",
        value: 222,
        unit: "mOsm/kg",
      }),
    ]);

    const currents = [
      cand({
        id: "cur_nh",
        metricId: "non_hdl_c",
        label: "NON HDL CHOLESTEROL",
        rawResult: "111",
        result: { kind: "numeric", value: 111, comparator: "eq" },
        page: 10,
        sourceValueRole: "current_result",
      }),
      cand({
        id: "cur_med",
        metricId: "ldl_medium",
        label: "LDL MEDIUM",
        rawResult: "401",
        result: { kind: "numeric", value: 401, comparator: "eq" },
        page: 9,
        sourceValueRole: "current_result",
        unit: "nmol/L",
      }),
      cand({
        id: "cur_urine",
        metricId: "osmolality_urine",
        label: "OSMOLALITY (U)",
        rawResult: "222",
        result: { kind: "numeric", value: 222, comparator: "eq" },
        page: 2,
        sourceValueRole: "current_result",
        unit: "mOsm/kg",
        panelName: "COMPREHENSIVE METABOLIC",
      }),
      cand({
        id: "cur_pat",
        metricId: "ldl_pattern",
        label: "LDL PATTERN",
        rawResult: "Pattern B",
        result: { kind: "pattern", value: "Pattern B" },
        page: 9,
        sourceValueRole: "current_result",
        unit: "none",
      }),
    ];

    const out = await runLabAutoPublishAfterDraft({
      uid: "u1",
      draft: draftWith(currents),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    });

    for (const id of staleIds) {
      expect(out.removedStaleIds).toContain(id);
      expect(results.store.has(id)).toBe(false);
      expect(accepted.store.has(id)).toBe(false);
    }

    const projected = [...results.store.values()] as {
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

    expect(projected.some((r) => r.metricKey === "osmolality_serum")).toBe(false);

    const grouped = groupLabResultsByCategory(projected);
    const byKey = Object.fromEntries(
      grouped.flatMap((g) =>
        g.metrics.map((m) => [
          m.definition.metricKey,
          formatLabResultValue(m.latest?.value, m.latest?.unit ?? m.definition.preferredUnit, {
            preferredUnit: m.definition.preferredUnit,
            rawValueText: m.latest?.rawValueText,
          }),
        ]),
      ),
    );

    expect(byKey.non_hdl_c).toBe("111 mg/dL");
    expect(byKey.ldl_medium).toBe("401 nmol/L");
    expect(byKey.osmolality_urine).toBe("222 mOsm/kg");
    expect(byKey.osmolality_serum).toBe("—");
    expect(byKey.ldl_pattern).toBe("Pattern B");
  });

  it("repeated reprocess is idempotent", async () => {
    const reviews = makeCol();
    const accepted = makeCol();
    const results = makeCol();
    const current = cand({
      id: "cur_nh",
      metricId: "non_hdl_c",
      label: "NON HDL CHOLESTEROL",
      rawResult: "111",
      result: { kind: "numeric", value: 111, comparator: "eq" },
      page: 10,
      sourceValueRole: "current_result",
    });
    const args = {
      uid: "u1",
      draft: draftWith([current]),
      now: iso,
      labReviewsCol: reviews as never,
      labAcceptedResultsCol: accepted as never,
      labResultsCol: results as never,
    };
    const first = await runLabAutoPublishAfterDraft(args);
    const second = await runLabAutoPublishAfterDraft(args);
    expect(second.projectedIds).toEqual(first.projectedIds);
    expect(results.store.size).toBe(1);
  });
});
