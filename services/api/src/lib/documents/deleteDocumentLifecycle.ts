/**
 * Unified Document OS + legacy Labs delete adapters (server).
 * Authenticated callers supply uid; ownership is path-scoped via userCollection.
 */

import type { UserDocumentRecord } from "@oli/contracts";
import {
  consumerDocumentIdForLabUpload,
  documentMirrorsLabUpload,
  labResultBelongsToUpload,
  uniqueStorageObjectPaths,
} from "../../../../../lib/data/documents/documentDeleteRelationships";
import {
  documentStorageObjectIdFromRecord,
  labUploadStoragePathFromRecord,
} from "../../../../../lib/data/documents/documentAccountLifecycle";

export type DocumentDeleteLifecycleOk = {
  ok: true;
  consumerDocumentId: string;
  ownershipKind: "document_os" | "legacy_lab";
  deletedStoragePaths: string[];
};

export type DocumentDeleteLifecycleErr = {
  ok: false;
  code: "NOT_FOUND" | "PARTIAL_DELETE_FAILED" | "PROVENANCE_AMBIGUOUS" | "INTERNAL";
  consumerDocumentId: string;
};

export type DocumentDeleteLifecycleResult = DocumentDeleteLifecycleOk | DocumentDeleteLifecycleErr;

type DocSnap = { exists: boolean; id: string; data: () => unknown };
type DocRef = {
  id: string;
  get: () => Promise<DocSnap>;
  delete: () => Promise<unknown>;
  update?: (data: Record<string, unknown>) => Promise<unknown>;
};

type QuerySnap = { docs: { id: string; data: () => unknown }[] };

type Col = {
  doc: (id: string) => DocRef;
  where: (
    field: string,
    op: string,
    value: unknown,
  ) => {
    where?: (
      field: string,
      op: string,
      value: unknown,
    ) => { limit: (n: number) => { get: () => Promise<QuerySnap> } };
    limit: (n: number) => { get: () => Promise<QuerySnap> };
    get?: () => Promise<QuerySnap>;
  };
};

export type DeleteDocumentLifecycleDeps = {
  documentsCol: Col;
  jobsCol: Col;
  extractionsCol: Col;
  labUploadsCol: Col;
  labResultsCol: Col;
  labDraftsCol?: Col;
  labReviewsCol?: Col;
  labAcceptedResultsCol?: Col;
  deleteStorageObject: (objectPath: string) => Promise<{ ok: true } | { ok: false }>;
  parseUserDocument: (raw: Record<string, unknown>, id: string) => UserDocumentRecord | null;
};

async function deleteQueryDocs(col: Col, field: string, value: string, limit = 50): Promise<number> {
  const snap = await col.where(field, "==", value).limit(limit).get();
  let n = 0;
  for (const d of snap.docs) {
    const raw = d.data() as Record<string, unknown>;
    // Extra identity guard when query mocks are unfiltered.
    if (raw[field] != null && raw[field] !== value && field !== "documentId") {
      // For documentId queries, id linkage is on the job/extraction record field.
    }
    if (field === "documentId" && raw.documentId != null && raw.documentId !== value) {
      continue;
    }
    await col.doc(d.id).delete();
    n += 1;
  }
  return n;
}

async function deleteStoragePaths(
  deps: DeleteDocumentLifecycleDeps,
  paths: readonly (string | null | undefined)[],
): Promise<{ deleted: string[]; failed: boolean }> {
  const deleted: string[] = [];
  let failed = false;
  for (const objectPath of uniqueStorageObjectPaths(paths)) {
    const res = await deps.deleteStorageObject(objectPath);
    if (!res.ok) {
      failed = true;
      continue;
    }
    deleted.push(objectPath);
  }
  return { deleted, failed };
}

async function deleteLabResultsForUpload(
  deps: DeleteDocumentLifecycleDeps,
  uploadId: string,
): Promise<{ ok: true; deleted: number } | { ok: false; code: "PROVENANCE_AMBIGUOUS" }> {
  const snap = await deps.labResultsCol.where("uploadId", "==", uploadId).limit(100).get();
  let deleted = 0;
  for (const d of snap.docs) {
    const raw = d.data() as Record<string, unknown>;
    const gate = labResultBelongsToUpload({
      resultUploadId: raw.uploadId,
      targetUploadId: uploadId,
    });
    if (gate === "ambiguous") {
      return { ok: false, code: "PROVENANCE_AMBIGUOUS" };
    }
    if (gate === "mismatch") {
      continue;
    }
    await deps.labResultsCol.doc(d.id).delete();
    deleted += 1;
  }
  return { ok: true, deleted };
}

/**
 * Delete a Document OS record and linked jobs/extractions/mirror lab upload + provenance results.
 * Storage must succeed before metadata is removed (retryable partial failure).
 */
export async function deleteDocumentOsRecord(args: {
  deps: DeleteDocumentLifecycleDeps;
  documentId: string;
  /** When true, skip deleting labUploads/{legacyId} (caller owns that step). */
  skipLegacyLabUploadMeta?: boolean;
}): Promise<DocumentDeleteLifecycleResult> {
  const { deps, documentId } = args;
  const consumerDocumentId = documentId;
  const snap = await deps.documentsCol.doc(documentId).get();
  if (!snap.exists) {
    return { ok: false, code: "NOT_FOUND", consumerDocumentId };
  }
  const record = deps.parseUserDocument(snap.data() as Record<string, unknown>, documentId);
  if (!record) {
    return { ok: false, code: "NOT_FOUND", consumerDocumentId };
  }

  const paths: string[] = [];
  const storageObjectId = documentStorageObjectIdFromRecord(record as unknown as Record<string, unknown>);
  if (storageObjectId) paths.push(storageObjectId);

  const labUploadId = record.legacyLabUploadId ?? null;
  if (labUploadId) {
    const labSnap = await deps.labUploadsCol.doc(labUploadId).get();
    if (labSnap.exists) {
      const labStoragePath = labUploadStoragePathFromRecord(labSnap.data() as Record<string, unknown>);
      if (labStoragePath) paths.push(labStoragePath);
    }
  }

  const storage = await deleteStoragePaths(deps, paths);
  if (storage.failed) {
    return { ok: false, code: "PARTIAL_DELETE_FAILED", consumerDocumentId };
  }

  await deleteQueryDocs(deps.jobsCol, "documentId", documentId);
  await deleteQueryDocs(deps.extractionsCol, "documentId", documentId);
  if (deps.labDraftsCol) await deleteQueryDocs(deps.labDraftsCol, "documentId", documentId);
  if (deps.labReviewsCol) await deleteQueryDocs(deps.labReviewsCol, "documentId", documentId);
  if (deps.labAcceptedResultsCol) {
    await deleteQueryDocs(deps.labAcceptedResultsCol, "sourceDocumentId", documentId);
  }

  // Projections use uploadId = documentId for Document OS publishes; always clean both ids.
  const projectionUploadIds = new Set<string>([documentId]);
  if (labUploadId) projectionUploadIds.add(labUploadId);
  for (const uploadId of projectionUploadIds) {
    const results = await deleteLabResultsForUpload(deps, uploadId);
    if (!results.ok) {
      return { ok: false, code: results.code, consumerDocumentId };
    }
  }
  if (labUploadId && !args.skipLegacyLabUploadMeta) {
    await deps.labUploadsCol.doc(labUploadId).delete().catch(() => undefined);
  }

  await deps.documentsCol.doc(documentId).delete();

  return {
    ok: true,
    consumerDocumentId,
    ownershipKind: "document_os",
    deletedStoragePaths: storage.deleted,
  };
}

/**
 * Delete a legacy labUploads record (+ storage, labResults, mirrored Document OS if linked).
 * Identity is lab upload id / legacyLabUploadId linkage — never filename.
 */
export async function deleteLegacyLabRecord(args: {
  deps: DeleteDocumentLifecycleDeps;
  labUploadId: string;
}): Promise<DocumentDeleteLifecycleResult> {
  const { deps, labUploadId } = args;
  const consumerDocumentId = consumerDocumentIdForLabUpload(labUploadId);
  const uploadSnap = await deps.labUploadsCol.doc(labUploadId).get();
  if (!uploadSnap.exists) {
    return { ok: false, code: "NOT_FOUND", consumerDocumentId };
  }

  const uploadRaw = uploadSnap.data() as Record<string, unknown>;
  const labStoragePath = labUploadStoragePathFromRecord(uploadRaw);

  const mirroredSnap = await deps.documentsCol.where("legacyLabUploadId", "==", labUploadId).limit(20).get();
  const mirroredIds: string[] = [];
  const mirroredPaths: string[] = [];
  for (const d of mirroredSnap.docs) {
    const raw = d.data() as Record<string, unknown>;
    if (!documentMirrorsLabUpload({ legacyLabUploadId: raw.legacyLabUploadId, targetUploadId: labUploadId })) {
      continue;
    }
    mirroredIds.push(d.id);
    const p = documentStorageObjectIdFromRecord(raw);
    if (p) mirroredPaths.push(p);
  }

  const storage = await deleteStoragePaths(deps, [labStoragePath ?? undefined, ...mirroredPaths]);
  if (storage.failed) {
    return { ok: false, code: "PARTIAL_DELETE_FAILED", consumerDocumentId };
  }

  const results = await deleteLabResultsForUpload(deps, labUploadId);
  if (!results.ok) {
    return { ok: false, code: results.code, consumerDocumentId };
  }

  for (const mirroredId of mirroredIds) {
    await deleteQueryDocs(deps.jobsCol, "documentId", mirroredId);
    await deleteQueryDocs(deps.extractionsCol, "documentId", mirroredId);
    await deps.documentsCol.doc(mirroredId).delete().catch(() => undefined);
  }

  await deps.labUploadsCol.doc(labUploadId).delete();

  return {
    ok: true,
    consumerDocumentId,
    ownershipKind: "legacy_lab",
    deletedStoragePaths: storage.deleted,
  };
}
