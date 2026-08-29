/**
 * Consumer consent architecture types (Stage 1B).
 * Presentation and readiness only — no durable persistence until RFC approval + RG-LEGAL-01.
 */

export type ConsentCategory =
  | "legal_terms"
  | "legal_privacy"
  | "health_data_processing"
  | "connected_source"
  | "professional_sharing";

export type LegalDocumentKind = "terms_of_service" | "privacy_policy";

/** Legal-assent readiness while RG-LEGAL-01 may be open. */
export type LegalAssentReadiness =
  | "inactive_unpublished" // RG-LEGAL-01 open; no hosted document
  | "inactive_not_configured" // env URL missing in build
  | "ready_for_activation" // hosted doc exists; durable write still gated
  | "active"; // future: user has durable acceptance on record

/** Connected-source permission is separate from legal consent. */
export type ConnectedSourceConsentPresentation =
  | "system_permission" // Apple Health, etc. — managed in iOS Settings
  | "integration_oauth"; // Oura OAuth connection

export type ConsentPersistenceStatus =
  | "not_implemented"
  | "blocked_pending_rfc_approval"
  | "blocked_rg_legal_01"
  | "implemented";

export type ConsumerConsentArchitectureSnapshot = {
  persistenceStatus: ConsentPersistenceStatus;
  legalTermsReadiness: LegalAssentReadiness;
  legalPrivacyReadiness: LegalAssentReadiness;
  healthDataProcessingReadiness: LegalAssentReadiness;
  rgLegal01Open: boolean;
  /** True when any legal-assent control would be dishonest to show as interactive. */
  legalAssentInactive: boolean;
};
