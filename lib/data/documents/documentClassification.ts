/**
 * Conservative document classification (pure).
 * Never silently upgrades unknown content to a trusted type.
 */

import type { DocumentClassificationResult, DocumentDomain, DocumentType } from "@/lib/contracts";
import { DOCUMENT_SCHEMA_VERSION } from "@/lib/contracts";
import { defaultDocumentTypeForDomain, documentTypeAllowedForDomain } from "./documentTypes";

export const DOCUMENT_CLASSIFIER_VERSION = "1.0.0" as const;

export type DocumentClassificationInput = {
  domain: DocumentDomain;
  userSelectedDocumentType?: DocumentType;
  /** Safe header text only — never full OCR body. Optional in v1. */
  safeHeaderText?: string | null;
};

export function classifyDocument(input: DocumentClassificationInput): DocumentClassificationResult {
  const selected = input.userSelectedDocumentType;
  if (selected && selected !== "unknown" && documentTypeAllowedForDomain(input.domain, selected)) {
    return {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      documentType: selected,
      confidence: 0.6,
      reasonCode: "user_selected_domain_constrained",
      requiresReview: true,
      classifierVersion: DOCUMENT_CLASSIFIER_VERSION,
    };
  }

  // Without trusted header signatures, fail closed to unknown.
  const header = (input.safeHeaderText ?? "").trim().toLowerCase();
  if (header.length === 0) {
    return {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      documentType: "unknown",
      confidence: null,
      reasonCode: "insufficient_signal",
      requiresReview: true,
      classifierVersion: DOCUMENT_CLASSIFIER_VERSION,
    };
  }

  // Extremely conservative keyword hints — still require review; never auto-trust.
  const domainDefault = defaultDocumentTypeForDomain(input.domain);
  if (input.domain === "labs" && /\b(lab|laboratory|specimen|analyte)\b/.test(header)) {
    return {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      documentType: domainDefault,
      confidence: 0.4,
      reasonCode: "weak_header_keyword",
      requiresReview: true,
      classifierVersion: DOCUMENT_CLASSIFIER_VERSION,
    };
  }

  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    documentType: "unknown",
    confidence: null,
    reasonCode: "uncertain_classification",
    requiresReview: true,
    classifierVersion: DOCUMENT_CLASSIFIER_VERSION,
  };
}
