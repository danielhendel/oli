/**
 * Dirty-account + history ownership regressions for Labs integrity migration.
 */
import {
  classifyLabDerivedRow,
  isThresholdSiblingOfEqualityCurrent,
  type LabDerivedAuditInput,
  type LabDocumentPresence,
} from "../classifyLabDerivedRow";
import {
  selectLabConsumerHistoryRows,
  selectLabConsumerLatestResult,
  type LabConsumerHistoryRow,
} from "../filterLabHistoryForConsumer";
import { planLabsSignedInReconciliation, applyLabsSignedInReconciliation } from "../labsSignedInReconciliationMigration";

function accepted(partial: Partial<LabDerivedAuditInput> & { id: string }): LabDerivedAuditInput {
  return {
    layer: "accepted",
    collection: "labAcceptedResults",
    canonicalMetricId: "total_cholesterol",
    sourceDocumentId: "doc_a",
    sourceExtractionId: "ex1",
    sourceCandidateId: partial.id,
    sourceValueRole: "current_result",
    resultKind: "numeric",
    comparator: "eq",
    rawValueText: "179",
    panelId: "lipid",
    specimenType: "serum",
    sourcePage: 6,
    collectedAt: "2024-10-15T00:00:00.000Z",
    reviewStatus: "auto_published",
    publicationMode: "auto",
    ...partial,
  };
}

function hist(partial: Partial<LabConsumerHistoryRow> & { id: string; resultFingerprint: string }): LabConsumerHistoryRow {
  return {
    canonicalMetricId: "total_cholesterol",
    collectedAt: "2024-10-15T00:00:00.000Z",
    sourceDocumentId: "doc_a",
    sourceValueRole: "current_result",
    result: { kind: "numeric", value: 179, comparator: "eq" },
    rawValueText: "179",
    sourcePage: 6,
    ...partial,
  };
}

describe("labs signed-in integrity — total cholesterol dirty account", () => {
  const docs: LabDocumentPresence[] = [
    { id: "doc_a", state: "active", checksumSha256: "aaa" },
    { id: "doc_deleted", state: "deleted", checksumSha256: "bbb" },
  ];

  it("classifies threshold sibling of equality current as reference_as_result", () => {
    const eq = accepted({ id: "acc_eq", rawValueText: "179", comparator: "eq", sourcePage: 9 });
    const thr = accepted({
      id: "acc_thr",
      rawValueText: "<200",
      comparator: "lt",
      sourceValueRole: "current_result",
      sourcePage: 6,
    });
    expect(isThresholdSiblingOfEqualityCurrent({ row: thr, peers: [eq, thr] })).toBe(true);
    const classified = classifyLabDerivedRow({
      row: thr,
      peers: [eq, thr],
      documentsById: new Map(docs.map((d) => [d.id, d])),
    });
    expect(classified.health).toBe("reference_as_result");
    expect(classified.decision).toBe("delete");
  });

  it("preserves genuine inequality current when no equality sibling (mercury pattern)", () => {
    const mercury = accepted({
      id: "acc_hg",
      canonicalMetricId: "mercury_blood",
      rawValueText: "<4",
      comparator: "lt",
      sourceValueRole: "current_result",
    });
    expect(isThresholdSiblingOfEqualityCurrent({ row: mercury, peers: [mercury] })).toBe(false);
    const classified = classifyLabDerivedRow({
      row: mercury,
      peers: [mercury],
      documentsById: new Map(docs.map((d) => [d.id, d])),
    });
    expect(classified.health).toBe("valid_active");
    expect(classified.decision).toBe("keep");
  });

  it("history excludes threshold and collapses to one point", () => {
    const rows: LabConsumerHistoryRow[] = [
      hist({
        id: "a1",
        resultFingerprint: "numeric:eq:179",
        result: { kind: "numeric", value: 179, comparator: "eq" },
        rawValueText: "179",
        sourcePage: 9,
      }),
      hist({
        id: "a2",
        resultFingerprint: "numeric:lt:200",
        result: { kind: "numeric", value: 200, comparator: "lt" },
        rawValueText: "<200",
        sourcePage: 6,
      }),
      hist({
        id: "a3",
        resultFingerprint: "numeric:eq:179",
        result: { kind: "numeric", value: 179, comparator: "eq" },
        rawValueText: "179",
        sourcePage: 6,
      }),
      hist({
        id: "orphan",
        sourceDocumentId: "doc_deleted",
        resultFingerprint: "numeric:eq:179",
        result: { kind: "numeric", value: 179, comparator: "eq" },
      }),
    ];
    // Orphan still eligible at history filter layer (document presence is migration concern);
    // threshold excluded; page representations collapsed to one.
    const history = selectLabConsumerHistoryRows(rows.filter((r) => r.sourceDocumentId === "doc_a"));
    expect(history).toHaveLength(1);
    expect(history[0]!.rawValueText).toBe("179");
    const latest = selectLabConsumerLatestResult(rows.filter((r) => r.sourceDocumentId === "doc_a"));
    expect(latest?.rawValueText).toBe("179");
    expect(latest?.result?.comparator).toBe("eq");
  });

  it("migration dry-run deletes threshold + deleted-source rows and preserves user correction", async () => {
    const acceptedRows = [
      accepted({ id: "acc_eq", rawValueText: "179", comparator: "eq" }),
      accepted({
        id: "acc_thr",
        rawValueText: "<200",
        comparator: "lt",
        sourceValueRole: "current_result",
      }),
      accepted({
        id: "acc_deleted_src",
        sourceDocumentId: "doc_deleted",
        rawValueText: "179",
        comparator: "eq",
      }),
      accepted({
        id: "acc_user",
        rawValueText: "180",
        comparator: "eq",
        reviewStatus: "user_corrected",
      }),
    ];
    const projections = acceptedRows.map((r) => ({ ...r, layer: "projection" as const, collection: "labResults" }));
    const plan = planLabsSignedInReconciliation({
      dryRun: true,
      accepted: acceptedRows,
      projections,
      documents: docs,
      extractionGenerations: 3,
    });
    expect(plan.manifest.aggregates.referenceAsResultRows).toBeGreaterThanOrEqual(1);
    expect(plan.manifest.aggregates.orphanRows + plan.manifest.aggregates.deletedDocumentsWithSurvivingRows).toBeGreaterThanOrEqual(1);
    expect(plan.preserveAcceptedIds).toContain("acc_user");
    expect(plan.deleteAcceptedIds).toContain("acc_thr");
    expect(plan.deleteAcceptedIds).toContain("acc_deleted_src");
    expect(plan.deleteAcceptedIds).not.toContain("acc_user");
    expect(plan.blocked).toBe(false);

    const deleted = new Set<string>();
    const applyDry = await applyLabsSignedInReconciliation(plan, {
      deleteAccepted: async (id) => {
        deleted.add(id);
      },
      deleteProjection: async (id) => {
        deleted.add(`p:${id}`);
      },
    });
    expect(applyDry.skipped).toBe(true);
    expect(deleted.size).toBe(0);

    const exec = planLabsSignedInReconciliation({
      dryRun: false,
      accepted: acceptedRows,
      projections,
      documents: docs,
      extractionGenerations: 3,
    });
    const apply = await applyLabsSignedInReconciliation(exec, {
      deleteAccepted: async (id) => {
        deleted.add(id);
      },
      deleteProjection: async (id) => {
        deleted.add(`p:${id}`);
      },
    });
    expect(apply.skipped).toBe(false);
    expect(deleted.has("acc_thr")).toBe(true);
    expect(deleted.has("acc_deleted_src")).toBe(true);
    expect(deleted.has("acc_user")).toBe(false);

    // Idempotent: second plan against cleaned set deletes nothing new.
    const remaining = acceptedRows.filter((r) => !deleted.has(r.id));
    const plan2 = planLabsSignedInReconciliation({
      dryRun: false,
      accepted: remaining,
      projections: remaining.map((r) => ({ ...r, layer: "projection" as const, collection: "labResults" })),
      documents: docs,
      extractionGenerations: 3,
    });
    expect(plan2.deleteAcceptedIds).toHaveLength(0);
  });
});
