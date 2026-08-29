/**
 * Maps public-link configuration to consent readiness (Stage 1B).
 * Pure — no I/O, no fake accepted states.
 */

import { isPublicLinkConfigured } from "@/lib/config/publicLinks";
import type {
  ConsumerConsentArchitectureSnapshot,
  LegalAssentReadiness,
} from "@/lib/consent/types";

export function buildConsumerConsentArchitectureSnapshot(): ConsumerConsentArchitectureSnapshot {
  const privacyConfigured = isPublicLinkConfigured("privacyPolicy");
  const termsConfigured = isPublicLinkConfigured("termsOfService");
  const rgLegal01Open = !privacyConfigured || !termsConfigured;

  const legalPrivacyReadiness: LegalAssentReadiness = privacyConfigured
    ? "ready_for_activation"
    : "inactive_unpublished";

  const legalTermsReadiness: LegalAssentReadiness = termsConfigured
    ? "ready_for_activation"
    : "inactive_unpublished";

  return {
    persistenceStatus: rgLegal01Open ? "blocked_rg_legal_01" : "blocked_pending_rfc_approval",
    legalTermsReadiness,
    legalPrivacyReadiness,
    healthDataProcessingReadiness: rgLegal01Open ? "inactive_unpublished" : "ready_for_activation",
    rgLegal01Open,
    legalAssentInactive: true, // Stage 1B: durable writes not activated
  };
}

export function legalAssentStatusLabel(readiness: LegalAssentReadiness): string {
  switch (readiness) {
    case "inactive_unpublished":
      return "Not yet available";
    case "inactive_not_configured":
      return "Not configured in this build";
    case "ready_for_activation":
      return "Pending activation";
    case "active":
      return "Accepted";
    default: {
      const _exhaustive: never = readiness;
      return _exhaustive;
    }
  }
}
