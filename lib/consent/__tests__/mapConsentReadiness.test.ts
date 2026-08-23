import { describe, expect, it } from "@jest/globals";

import {
  buildConsumerConsentArchitectureSnapshot,
  legalAssentStatusLabel,
} from "@/lib/consent/mapConsentReadiness";

jest.mock("@/lib/config/publicLinks", () => ({
  isPublicLinkConfigured: jest.fn(() => false),
}));

describe("consent readiness", () => {
  it("keeps legal assent inactive when RG-LEGAL-01 is open", () => {
    const snapshot = buildConsumerConsentArchitectureSnapshot();
    expect(snapshot.rgLegal01Open).toBe(true);
    expect(snapshot.legalAssentInactive).toBe(true);
    expect(snapshot.persistenceStatus).toBe("blocked_rg_legal_01");
    expect(snapshot.legalTermsReadiness).toBe("inactive_unpublished");
    expect(snapshot.legalPrivacyReadiness).toBe("inactive_unpublished");
  });

  it("does not produce active legal acceptance labels", () => {
    const snapshot = buildConsumerConsentArchitectureSnapshot();
    expect(legalAssentStatusLabel(snapshot.legalTermsReadiness)).not.toBe("Accepted");
    expect(legalAssentStatusLabel(snapshot.legalPrivacyReadiness)).not.toBe("Accepted");
  });

  it("labels Apple Health as separate from legal assent", () => {
    expect(legalAssentStatusLabel("inactive_unpublished")).toBe("Not yet available");
  });
});
