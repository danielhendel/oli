/**
 * Body Scan persistence for the `scans` document domain (server).
 *
 * A scan is one-to-one with its source document, so `scanId === documentId`. That keeps
 * reprocess, delete, and export linkage deterministic without a second id space.
 *
 * Every write goes through the Body Scan isolation guard: scan data may only land in
 * bodyScans / bodyScanDrafts / bodyScanFacts.
 */

import type {
  BodyScanExtractionDraft,
  BodyScanFact,
  BodyScanMetric,
  BodyScanRecord,
  UserDocumentRecord,
} from "@oli/contracts";
import { BODY_SCAN_SCHEMA_VERSION } from "@oli/contracts";
import { assertBodyScanWriteTargetAllowed } from "../../../../../lib/data/body-scans/bodyScanTrendIsolation";
import { bodyScanStatusFromDraftStatus } from "../../../../../lib/data/body-scans/bodyScanStatusMachine";

type DocRef = {
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (data: unknown, opts?: { merge?: boolean }) => Promise<unknown>;
  update: (data: unknown) => Promise<unknown>;
  delete: () => Promise<unknown>;
};

type Col = {
  doc: (id?: string) => DocRef;
  where: (
    field: string,
    op: string,
    value: unknown,
  ) => {
    limit: (n: number) => { get: () => Promise<{ docs: { id: string; data: () => unknown }[] }> };
    get?: () => Promise<{ docs: { id: string; data: () => unknown }[] }>;
  };
};

export type BodyScanPersistenceDeps = {
  bodyScansCol: Col;
  bodyScanDraftsCol: Col;
  bodyScanFactsCol: Col;
};

export function bodyScanIdForDocument(documentId: string): string {
  return documentId;
}

export function bodyScanDraftId(scanId: string, adapterId: string): string {
  return `draft_${scanId}_${adapterId}`;
}

/**
 * Build the durable scan record for a freshly ingested (or reprocessed) document.
 * A draft never yields `verified` — confirmation is a separate, explicit user action.
 */
export function buildBodyScanRecord(args: {
  uid: string;
  document: UserDocumentRecord;
  draft: BodyScanExtractionDraft | null;
  previous: BodyScanRecord | null;
  now: string;
}): BodyScanRecord {
  const scanId = bodyScanIdForDocument(args.document.id);
  const draft = args.draft;
  const status = draft ? bodyScanStatusFromDraftStatus(draft.status) : "needs_review";

  return {
    schemaVersion: BODY_SCAN_SCHEMA_VERSION,
    id: scanId,
    userId: args.uid,
    documentId: args.document.id,
    scanType: draft?.scanTypeCandidate ?? args.previous?.scanType ?? "other",
    method: draft?.methodCandidate ?? args.previous?.method ?? "other",
    device: draft?.device ?? args.previous?.device ?? { manufacturer: null, model: null },
    performedAt: draft?.performedAtCandidate ?? args.previous?.performedAt ?? null,
    status,
    adapter: draft?.adapter ?? null,
    extractionDraftId: draft?.id ?? null,
    // Reprocess invalidates previously confirmed metrics: they must be re-reviewed.
    metrics: [],
    reviewedAt: null,
    correctionCount: 0,
    failureCode: draft?.status === "failed" ? "EXTRACTION_FAILED" : null,
    retentionStatus: "active",
    createdAt: args.previous?.createdAt ?? args.document.uploadedAt ?? args.now,
    updatedAt: args.now,
  };
}

export function buildBodyScanFact(args: {
  record: BodyScanRecord;
  metrics: readonly BodyScanMetric[];
  confirmedAt: string;
}): BodyScanFact {
  return {
    schemaVersion: BODY_SCAN_SCHEMA_VERSION,
    id: `fact_${args.record.id}`,
    userId: args.record.userId,
    scanId: args.record.id,
    documentId: args.record.documentId,
    scanType: args.record.scanType,
    method: args.record.method,
    performedAt: args.record.performedAt,
    confirmedAt: args.confirmedAt,
    metrics: [...args.metrics],
    excludedFromContinuousTrends: true,
  };
}

function parseBodyScanRecord(raw: unknown): BodyScanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as BodyScanRecord;
}

export async function loadBodyScanRecord(
  deps: Pick<BodyScanPersistenceDeps, "bodyScansCol">,
  scanId: string,
): Promise<BodyScanRecord | null> {
  const snap = await deps.bodyScansCol.doc(scanId).get();
  if (!snap.exists) return null;
  return parseBodyScanRecord(snap.data());
}

/**
 * Upsert the scan record and its extraction draft after ingestion.
 * Called for every `scans` document — including unsupported report types, which land in
 * manual review with the original preserved rather than being dropped.
 */
export async function persistBodyScanFromIngestion(args: {
  deps: BodyScanPersistenceDeps;
  uid: string;
  document: UserDocumentRecord;
  draft: BodyScanExtractionDraft | null;
  now: string;
}): Promise<BodyScanRecord> {
  const scanId = bodyScanIdForDocument(args.document.id);
  const previous = await loadBodyScanRecord(args.deps, scanId);
  const record = buildBodyScanRecord({
    uid: args.uid,
    document: args.document,
    draft: args.draft,
    previous,
    now: args.now,
  });

  assertBodyScanWriteTargetAllowed("bodyScans");
  await args.deps.bodyScansCol.doc(scanId).set(record);

  if (args.draft) {
    assertBodyScanWriteTargetAllowed("bodyScanDrafts");
    await args.deps.bodyScanDraftsCol.doc(args.draft.id).set({
      ...args.draft,
      userId: args.uid,
      scanId,
      superseded: false,
    });
  }

  // A reprocess supersedes any previously confirmed facts for this scan.
  if (previous?.status === "verified") {
    assertBodyScanWriteTargetAllowed("bodyScanFacts");
    await args.deps.bodyScanFactsCol
      .doc(`fact_${scanId}`)
      .delete()
      .catch(() => undefined);
  }

  return record;
}
