/**
 * Explicit relationship helpers for Document OS ↔ legacy Labs delete lifecycle.
 * Identity is by stable ids / linkage fields — never by filename.
 */

import { parseLegacyLabDocumentId } from "./mapLegacyLabUpload";

export type DocumentDeleteIdentity =
  | { kind: "document_os"; documentId: string; legacyLabUploadId: string | null }
  | { kind: "legacy_lab"; consumerDocumentId: string; labUploadId: string };

/** Resolve which delete adapter owns a consumer document id. */
export function resolveDocumentDeleteIdentity(consumerDocumentId: string): DocumentDeleteIdentity | null {
  if (!consumerDocumentId) return null;
  const labUploadId = parseLegacyLabDocumentId(consumerDocumentId);
  if (labUploadId) {
    return {
      kind: "legacy_lab",
      consumerDocumentId,
      labUploadId,
    };
  }
  return {
    kind: "document_os",
    documentId: consumerDocumentId,
    legacyLabUploadId: null,
  };
}

/** Consumer id for a legacy lab upload metadata id. */
export function consumerDocumentIdForLabUpload(labUploadId: string): string {
  return `lab:${labUploadId}`;
}

/**
 * Provenance gate for labResults rows.
 * Only rows with an explicit matching uploadId may be deleted with that upload.
 */
export function labResultBelongsToUpload(args: {
  resultUploadId: unknown;
  targetUploadId: string;
}): "match" | "mismatch" | "ambiguous" {
  if (typeof args.resultUploadId !== "string" || args.resultUploadId.length === 0) {
    return "ambiguous";
  }
  return args.resultUploadId === args.targetUploadId ? "match" : "mismatch";
}

/**
 * Whether a Document OS record is the mirror of a given lab upload (explicit linkage only).
 */
export function documentMirrorsLabUpload(args: {
  legacyLabUploadId: unknown;
  targetUploadId: string;
}): boolean {
  return (
    typeof args.legacyLabUploadId === "string" &&
    args.legacyLabUploadId.length > 0 &&
    args.legacyLabUploadId === args.targetUploadId
  );
}

/**
 * Deduplicate storage object paths so mirrored document + lab upload share one delete.
 */
export function uniqueStorageObjectPaths(paths: readonly (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of paths) {
    if (typeof p !== "string" || p.length === 0) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}
