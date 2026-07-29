/**
 * Shared helpers for account export/delete of Document Ingestion OS artifacts.
 * Pure — no React, no Firebase I/O. Used by Functions executors and tests.
 */

export const DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS = [
  "documents",
  "documentIngestionJobs",
  "documentExtractions",
  "labUploads",
  "labResults",
] as const;

export type DocumentAccountFirestoreCollection = (typeof DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS)[number];

/** User-scoped Storage prefixes that must be removed on account delete. */
export function documentAccountStoragePrefixes(uid: string): readonly string[] {
  return [`users/${uid}/documents/`, `lab-uploads/${uid}/`];
}

/** Consumer-safe document metadata for account export manifests (no storage path / uid). */
export type SafeDocumentExportRecord = {
  id: string;
  filename: string;
  domain: string;
  documentType: string;
  status: string;
  uploadedAt: string;
  source: string;
  parserId: string | null;
  parserVersion: string | null;
  schemaVersion: string;
  byteSize: number;
  checksumSha256: string;
  legacyLabUploadId: string | null;
  originalFile: {
    packageRelativePath: string;
    includedInPackage: boolean;
  };
};

export function buildSafeDocumentExportRecord(raw: Record<string, unknown>): SafeDocumentExportRecord | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const filename =
    (typeof raw.safeDisplayFilename === "string" && raw.safeDisplayFilename) ||
    (typeof raw.originalFilename === "string" && raw.originalFilename) ||
    null;
  const domain = typeof raw.domain === "string" ? raw.domain : null;
  const documentType = typeof raw.documentType === "string" ? raw.documentType : null;
  const status = typeof raw.status === "string" ? raw.status : null;
  const uploadedAt = typeof raw.uploadedAt === "string" ? raw.uploadedAt : null;
  const schemaVersion = typeof raw.schemaVersion === "string" ? raw.schemaVersion : null;
  const byteSize = typeof raw.byteSize === "number" && Number.isFinite(raw.byteSize) ? raw.byteSize : null;
  const checksumSha256 = typeof raw.checksumSha256 === "string" ? raw.checksumSha256 : null;
  if (!id || !filename || !domain || !documentType || !status || !uploadedAt || !schemaVersion || byteSize == null || !checksumSha256) {
    return null;
  }

  const parser =
    raw.parser && typeof raw.parser === "object"
      ? (raw.parser as { id?: unknown; version?: unknown })
      : null;

  const safeName = filename.replace(/[/\\]/g, "_").slice(0, 180) || "document";
  return {
    id,
    filename,
    domain,
    documentType,
    status,
    uploadedAt,
    source: typeof raw.source === "string" ? raw.source : "user_upload",
    parserId: typeof parser?.id === "string" ? parser.id : null,
    parserVersion: typeof parser?.version === "string" ? parser.version : null,
    schemaVersion,
    byteSize,
    checksumSha256,
    legacyLabUploadId: typeof raw.legacyLabUploadId === "string" ? raw.legacyLabUploadId : null,
    originalFile: {
      packageRelativePath: `files/documents/${id}/${safeName}`,
      // Binary packaging into the export bucket is best-effort; relationship is always present.
      includedInPackage: false,
    },
  };
}

export function buildSafeLabUploadExportRecord(raw: Record<string, unknown>): {
  id: string;
  filename: string;
  status: string;
  uploadedAt: string;
  extractedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  originalFile: { packageRelativePath: string; includedInPackage: boolean };
} | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const filename = typeof raw.fileName === "string" ? raw.fileName : null;
  const status = typeof raw.status === "string" ? raw.status : null;
  const uploadedAt = typeof raw.uploadedAt === "string" ? raw.uploadedAt : null;
  if (!id || !filename || !status || !uploadedAt) return null;
  const safeName = filename.replace(/[/\\]/g, "_").slice(0, 180) || "lab.pdf";
  return {
    id,
    filename,
    status,
    uploadedAt,
    extractedCount: typeof raw.extractedCount === "number" ? raw.extractedCount : 0,
    matchedCount: typeof raw.matchedCount === "number" ? raw.matchedCount : 0,
    unmatchedCount: typeof raw.unmatchedCount === "number" ? raw.unmatchedCount : 0,
    originalFile: {
      packageRelativePath: `files/labUploads/${id}/${safeName}`,
      includedInPackage: false,
    },
  };
}

/** Operational object id from a document record — never for consumer UI/manifest. */
export function documentStorageObjectIdFromRecord(raw: Record<string, unknown>): string | null {
  return typeof raw.storageObjectId === "string" && raw.storageObjectId.length > 0
    ? raw.storageObjectId
    : null;
}

export function labUploadStoragePathFromRecord(raw: Record<string, unknown>): string | null {
  return typeof raw.storagePath === "string" && raw.storagePath.length > 0 ? raw.storagePath : null;
}
