import { describe, expect, it } from "@jest/globals";
import { DOCUMENT_SCHEMA_VERSION } from "@/lib/contracts";
import { classifyDocument, DOCUMENT_CLASSIFIER_VERSION } from "../documentClassification";

describe("classifyDocument", () => {
  it("returns unknown when there is insufficient signal", () => {
    const result = classifyDocument({ domain: "labs" });
    expect(result).toEqual({
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      documentType: "unknown",
      confidence: null,
      reasonCode: "insufficient_signal",
      requiresReview: true,
      classifierVersion: DOCUMENT_CLASSIFIER_VERSION,
    });
  });

  it("constrains user-selected type by domain", () => {
    const allowed = classifyDocument({
      domain: "labs",
      userSelectedDocumentType: "lab_report",
    });
    expect(allowed.documentType).toBe("lab_report");
    expect(allowed.reasonCode).toBe("user_selected_domain_constrained");
    expect(allowed.confidence).toBe(0.6);
    expect(allowed.requiresReview).toBe(true);

    const disallowed = classifyDocument({
      domain: "labs",
      userSelectedDocumentType: "dna_report",
    });
    expect(disallowed.documentType).toBe("unknown");
    expect(disallowed.reasonCode).toBe("insufficient_signal");
    expect(disallowed.requiresReview).toBe(true);

    const scans = classifyDocument({
      domain: "scans",
      userSelectedDocumentType: "imaging_report",
    });
    expect(scans.documentType).toBe("imaging_report");
    expect(scans.requiresReview).toBe(true);
  });

  it("keeps requiresReview true for weak keyword and uncertain outcomes", () => {
    const weak = classifyDocument({
      domain: "labs",
      safeHeaderText: "Laboratory specimen report",
    });
    expect(weak.documentType).toBe("lab_report");
    expect(weak.reasonCode).toBe("weak_header_keyword");
    expect(weak.requiresReview).toBe(true);

    const uncertain = classifyDocument({
      domain: "labs",
      safeHeaderText: "random header with no domain keywords",
    });
    expect(uncertain.documentType).toBe("unknown");
    expect(uncertain.reasonCode).toBe("uncertain_classification");
    expect(uncertain.requiresReview).toBe(true);
  });

  it("always sets requiresReview true in v1 outcomes covered here", () => {
    const outcomes = [
      classifyDocument({ domain: "labs" }),
      classifyDocument({ domain: "labs", userSelectedDocumentType: "lab_report" }),
      classifyDocument({ domain: "labs", userSelectedDocumentType: "dexa_report" }),
      classifyDocument({ domain: "labs", safeHeaderText: "lab analyte panel" }),
      classifyDocument({ domain: "medical_history", safeHeaderText: "visit summary" }),
      classifyDocument({ domain: "scans", userSelectedDocumentType: "dexa_report" }),
    ];
    for (const outcome of outcomes) {
      expect(outcome.requiresReview).toBe(true);
    }
  });
});
