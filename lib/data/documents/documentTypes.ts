/**
 * Document Ingestion OS — domain / type helpers (pure).
 * No React, Firebase, or network I/O.
 */

import type { DocumentDomain, DocumentType } from "@oli/contracts";

export const DOCUMENT_DOMAINS = [
  "labs",
  "scans",
  "dna",
  "medical_history",
  "medications",
  "supplements",
  "other_health_record",
] as const satisfies readonly DocumentDomain[];

export const DOCUMENT_TYPES = [
  "lab_report",
  "dexa_report",
  "imaging_report",
  "dna_report",
  "medical_record",
  "medication_record",
  "supplement_record",
  "unknown",
] as const satisfies readonly DocumentType[];

/**
 * Domains allowed to receive uploads (lifecycle-gated).
 * `scans` joined in Stage 3E once Body Scans export, delete, and account-deletion coverage
 * landed. The Body Scans UI is additionally gated by the `bodyScans` feature flag.
 */
export const DOCUMENT_UPLOAD_ENABLED_DOMAINS = ["labs", "scans"] as const;

export type DocumentUploadEnabledDomain = (typeof DOCUMENT_UPLOAD_ENABLED_DOMAINS)[number];

export function isDocumentUploadEnabledDomain(domain: DocumentDomain): domain is DocumentUploadEnabledDomain {
  return (DOCUMENT_UPLOAD_ENABLED_DOMAINS as readonly string[]).includes(domain);
}

/**
 * Domains intentionally deferred until export/delete + production upload transport are proven.
 * These remain UI-listable via placeholders when the flag is on, but uploads fail closed.
 */
export const DOCUMENT_UPLOAD_DEFERRED_DOMAINS = [
  "dna",
  "medications",
  "supplements",
  "medical_history",
  "other_health_record",
] as const;

const DOMAIN_DEFAULT_DOCUMENT_TYPE: Record<DocumentDomain, DocumentType> = {
  labs: "lab_report",
  scans: "dexa_report",
  dna: "dna_report",
  medical_history: "medical_record",
  medications: "medication_record",
  supplements: "supplement_record",
  other_health_record: "unknown",
};

export function defaultDocumentTypeForDomain(domain: DocumentDomain): DocumentType {
  return DOMAIN_DEFAULT_DOCUMENT_TYPE[domain];
}

export function documentTypeAllowedForDomain(domain: DocumentDomain, documentType: DocumentType): boolean {
  if (documentType === "unknown") return true;
  switch (domain) {
    case "labs":
      return documentType === "lab_report";
    case "scans":
      return documentType === "dexa_report" || documentType === "imaging_report";
    case "dna":
      return documentType === "dna_report";
    case "medical_history":
      return documentType === "medical_record";
    case "medications":
      return documentType === "medication_record";
    case "supplements":
      return documentType === "supplement_record";
    case "other_health_record":
      return true;
    default: {
      const _exhaustive: never = domain;
      return _exhaustive;
    }
  }
}
