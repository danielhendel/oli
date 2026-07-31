/**
 * Document parser registry — fail-closed stubs (server-side).
 * No fake structured health extraction. Do not reintroduce mock lab biomarkers.
 */

import type { DocumentType } from "@oli/contracts";
import {
  buildUnsupportedExtractionResult,
  type DocumentParser,
  type DocumentParserInput,
  type DocumentParserRegistryEntry,
  type ParserEligibilityResult,
} from "../../../../../lib/data/documents/documentParser";

const EXTRACTION_VERSION = "1.0.0";

function makeUnsupportedParser(args: {
  id: string;
  version: string;
  supportedDocumentTypes: readonly DocumentType[];
  warningCode: string;
  warningMessage: string;
}): DocumentParser {
  return {
    id: args.id,
    version: args.version,
    supportedDocumentTypes: args.supportedDocumentTypes,
    async canParse(input: DocumentParserInput): Promise<ParserEligibilityResult> {
      if (!args.supportedDocumentTypes.includes(input.documentType) && input.documentType !== "unknown") {
        return { eligible: false, reasonCode: "document_type_not_supported" };
      }
      return { eligible: true };
    },
    async parse(input: DocumentParserInput) {
      const now = new Date().toISOString();
      return buildUnsupportedExtractionResult({
        documentId: input.documentId,
        parserId: args.id,
        parserVersion: args.version,
        extractionVersion: EXTRACTION_VERSION,
        checksumSha256: input.checksumSha256,
        createdAt: now,
        warningCode: args.warningCode,
        warningMessage: args.warningMessage,
      });
    },
  };
}

/** Metadata-only: may note structural facts later; v1 never invents health fields. */
export const metadataOnlyParser: DocumentParser = makeUnsupportedParser({
  id: "metadata_only",
  version: "1.0.0",
  supportedDocumentTypes: [
    "lab_report",
    "dexa_report",
    "imaging_report",
    "dna_report",
    "medical_record",
    "medication_record",
    "supplement_record",
    "unknown",
  ],
  warningCode: "STRUCTURED_EXTRACTION_UNAVAILABLE",
  warningMessage: "This document is stored, but structured extraction is not available yet.",
});

export const unsupportedLabParser: DocumentParser = makeUnsupportedParser({
  id: "unsupported_lab",
  version: "1.0.0",
  supportedDocumentTypes: ["lab_report"],
  warningCode: "LAB_STRUCTURED_EXTRACTION_UNAVAILABLE",
  warningMessage: "This report is stored, but structured extraction is not available yet.",
});

export const unsupportedDexaParser: DocumentParser = makeUnsupportedParser({
  id: "unsupported_dexa",
  version: "1.0.0",
  supportedDocumentTypes: ["dexa_report", "imaging_report"],
  warningCode: "DEXA_STRUCTURED_EXTRACTION_UNAVAILABLE",
  warningMessage: "This scan report is stored, but structured extraction is not available yet.",
});

export const unsupportedDnaParser: DocumentParser = makeUnsupportedParser({
  id: "unsupported_dna",
  version: "1.0.0",
  supportedDocumentTypes: ["dna_report"],
  warningCode: "DNA_STRUCTURED_EXTRACTION_UNAVAILABLE",
  warningMessage: "This DNA report is stored, but structured extraction is not available yet.",
});

export const DOCUMENT_PARSER_REGISTRY: readonly DocumentParserRegistryEntry[] = [
  { parser: unsupportedLabParser, autoRun: true },
  { parser: unsupportedDexaParser, autoRun: true },
  { parser: unsupportedDnaParser, autoRun: false },
  { parser: metadataOnlyParser, autoRun: true },
];

export function resolveDocumentParser(args: {
  documentType: DocumentType;
  parserId?: string;
}): DocumentParser {
  if (args.parserId) {
    const found = DOCUMENT_PARSER_REGISTRY.find((e) => e.parser.id === args.parserId);
    if (found) return found.parser;
  }

  const typed = DOCUMENT_PARSER_REGISTRY.find(
    (e) => e.autoRun && e.parser.supportedDocumentTypes.includes(args.documentType) && e.parser.id !== "metadata_only",
  );
  if (typed) return typed.parser;

  return metadataOnlyParser;
}
