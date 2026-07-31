/**
 * Versioned document parser interface + registry contracts (pure).
 * Implementations live server-side; this module defines eligibility and shapes only.
 */

import type {
  DocumentDomain,
  DocumentExtractionResult,
  DocumentType,
  UserDocumentRecord,
} from "@oli/contracts";

export type DocumentParserInput = {
  documentId: string;
  domain: DocumentDomain;
  documentType: DocumentType;
  mediaType: UserDocumentRecord["mediaType"];
  byteSize: number;
  checksumSha256: string;
  /** Opaque storage object id — never a public URL. */
  storageObjectId: string;
  safeDisplayFilename: string;
  /** Optional structural bytes for metadata-only parsers (e.g. PDF header). */
  fileBytes?: Uint8Array;
  reprocess?: {
    previousExtractionId?: string;
    dryRun?: boolean;
  };
  options?: Record<string, string | number | boolean | null>;
};

export type ParserEligibilityResult =
  | { eligible: true }
  | { eligible: false; reasonCode: string };

export type DocumentParser = {
  id: string;
  version: string;
  supportedDocumentTypes: readonly DocumentType[];
  canParse(input: DocumentParserInput): Promise<ParserEligibilityResult>;
  parse(input: DocumentParserInput): Promise<DocumentExtractionResult>;
};

export type DocumentParserRegistryEntry = {
  parser: DocumentParser;
  /** When true, parser may run automatically after classification. */
  autoRun: boolean;
};

export function buildUnsupportedExtractionResult(args: {
  documentId: string;
  parserId: string;
  parserVersion: string;
  extractionVersion: string;
  checksumSha256: string;
  createdAt: string;
  warningCode: string;
  warningMessage: string;
}): DocumentExtractionResult {
  return {
    schemaVersion: "1.0.0",
    documentId: args.documentId,
    parserId: args.parserId,
    parserVersion: args.parserVersion,
    extractionVersion: args.extractionVersion,
    status: "unsupported",
    pagesProcessed: 0,
    fields: [],
    warnings: [{ code: args.warningCode, message: args.warningMessage }],
    confidenceSummary: { overall: null, lowConfidenceFieldCount: 0 },
    provenance: [],
    sourceDocumentChecksum: args.checksumSha256,
    reviewStatus: "extracted",
    createdAt: args.createdAt,
  };
}
