/**
 * Pure document export assembly for account export (no Firebase I/O).
 * Shared by production executor and emulator test double.
 */
import {
  DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS,
  buildSafeDocumentExportRecord,
  buildSafeLabUploadExportRecord,
  type SafeDocumentExportRecord,
} from "../../../../lib/data/documents/documentAccountLifecycle";

export { DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS };

export type DocumentExportSection = {
  documents: SafeDocumentExportRecord[];
  labUploads: NonNullable<ReturnType<typeof buildSafeLabUploadExportRecord>>[];
  jobs: Record<string, unknown>[];
  extractions: Record<string, unknown>[];
  incomplete: string[];
};

function stripExtractionForExport(raw: Record<string, unknown>): Record<string, unknown> {
  // Keep staging envelope metadata; omit oversized field bodies if ever present at scale.
  return {
    id: raw.id,
    documentId: raw.documentId,
    parserId: raw.parserId,
    parserVersion: raw.parserVersion,
    extractionVersion: raw.extractionVersion,
    status: raw.status,
    reviewStatus: raw.reviewStatus,
    schemaVersion: raw.schemaVersion,
    createdAt: raw.createdAt,
    pagesProcessed: raw.pagesProcessed,
    confidenceSummary: raw.confidenceSummary,
    warnings: raw.warnings,
    provenance: raw.provenance,
    fieldCount: Array.isArray(raw.fields) ? raw.fields.length : 0,
    // Explicitly do not export raw field health values as "current truth"
    fieldsExportedAsStagingOnly: true,
  };
}

function stripJobForExport(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    id: raw.id,
    documentId: raw.documentId,
    state: raw.state,
    domain: raw.domain,
    documentType: raw.documentType,
    parserId: raw.parserId ?? null,
    parserVersion: raw.parserVersion ?? null,
    extractionVersion: raw.extractionVersion ?? null,
    dryRun: raw.dryRun ?? false,
    reprocessOfJobId: raw.reprocessOfJobId ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    stateHistory: raw.stateHistory ?? [],
  };
}

export function assembleDocumentExportSection(args: {
  documents: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  extractions: Record<string, unknown>[];
  labUploads: Record<string, unknown>[];
}): DocumentExportSection {
  const incomplete: string[] = [];
  const documents: SafeDocumentExportRecord[] = [];
  for (const row of args.documents) {
    const safe = buildSafeDocumentExportRecord(row);
    if (!safe) {
      incomplete.push("document_metadata_invalid");
      continue;
    }
    documents.push(safe);
  }

  const labUploads = [];
  for (const row of args.labUploads) {
    const safe = buildSafeLabUploadExportRecord(row);
    if (!safe) {
      incomplete.push("lab_upload_metadata_invalid");
      continue;
    }
    labUploads.push(safe);
  }

  return {
    documents,
    labUploads,
    jobs: args.jobs.map(stripJobForExport),
    extractions: args.extractions.map(stripExtractionForExport),
    incomplete,
  };
}
