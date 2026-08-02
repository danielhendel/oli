/**
 * Auto-publish policy eligibility tests (Phase 3D-A).
 * Structural only — no clinical values asserted as health truth.
 */
import type { LabReportMetadataCandidate, LabResultCandidate } from "@oli/contracts";
import { LAB_AUTO_PUBLISH_POLICY_VERSION } from "@oli/contracts";
import {
  deriveLabCandidateConfidence,
  evaluateLabAutoPublish,
} from "../evaluateLabAutoPublish";
import { partitionLabCandidatesForAutoPublish } from "../partitionLabAutoPublish";
import { assertImportProfilesCatalogAligned } from "../labMetricImportProfiles";

const checksum = "a".repeat(64);
const iso = "2024-03-15T12:00:00.000Z";

function report(partial: Partial<LabReportMetadataCandidate> = {}): LabReportMetadataCandidate {
  return {
    confidence: 0.99,
    collectedAt: iso,
    reportedAt: iso,
    laboratoryName: "Quest Diagnostics",
    reportFamily: "quest_directlabs_text",
    formatFamilyVersion: "1.0.0",
    pageCount: 1,
    ...partial,
  };
}

function candidate(partial: Partial<LabResultCandidate> & Pick<LabResultCandidate, "id">): LabResultCandidate {
  return {
    id: partial.id,
    rawAnalyteLabel: partial.rawAnalyteLabel ?? "LDL-CHOLESTEROL",
    rawResult: partial.rawResult ?? "98",
    result: partial.result ?? { kind: "numeric", value: 98, comparator: "eq" },
    unit: partial.unit ?? {
      rawUnit: "mg/dL",
      normalizedUnit: "mg/dL",
      unitRegistryVersion: "1.1.0",
      confidence: 0.99,
      known: true,
    },
    rawReferenceRange: partial.rawReferenceRange ?? "<100",
    structuredReferenceRange: null,
    flag: partial.flag ?? { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
    panelId: null,
    aliasMatch: partial.aliasMatch ?? {
      canonicalMetricId: "ldl_c",
      matchMethod: "exact_alias",
      aliasVersion: "1.1.0",
      confidence: 0.95,
      requiresReview: false,
    },
    provenance: partial.provenance ?? {
      sourceDocumentId: "doc1",
      sourcePage: 1,
      sourceLocator: "p1:L1:LDL",
      sourceChecksumSha256: checksum,
      parserId: "quest_text_pdf_v1",
      parserVersion: "1.1.0",
      extractionVersion: "1.1.0",
      resultRole: "current",
    },
    confidence: partial.confidence ?? 0.95,
    warnings: partial.warnings ?? [],
    reviewStatus: partial.reviewStatus ?? "pending_review",
  };
}

describe("evaluateLabAutoPublish", () => {
  it("marks high-confidence numeric equality eligible", () => {
    const c = candidate({ id: "c1" });
    const r = report();
    const confidence = deriveLabCandidateConfidence({ report: r, candidate: c, duplicateInReport: false });
    const decision = evaluateLabAutoPublish({
      report: r,
      candidate: c,
      reportFamilyEligible: true,
      confidence,
      warningCodes: [],
    });
    expect(decision.eligible).toBe(true);
    if (decision.eligible) {
      expect(decision.policyVersion).toBe(LAB_AUTO_PUBLISH_POLICY_VERSION);
    }
  });

  it("blocks unmatched, inequality, unknown unit, missing date, historical, and blocking warnings independently", () => {
    const r = report();
    const base = candidate({ id: "c1" });

    const unmatched = evaluateLabAutoPublish({
      report: r,
      candidate: {
        ...base,
        aliasMatch: {
          canonicalMetricId: null,
          matchMethod: "unmatched",
          aliasVersion: "1.1.0",
          confidence: 0.2,
          requiresReview: true,
        },
      },
      reportFamilyEligible: true,
      confidence: deriveLabCandidateConfidence({ report: r, candidate: base, duplicateInReport: false }),
      warningCodes: [],
    });
    expect(unmatched.eligible).toBe(false);

    const inequality = evaluateLabAutoPublish({
      report: r,
      candidate: { ...base, result: { kind: "numeric", value: 4, comparator: "lt" } },
      reportFamilyEligible: true,
      confidence: deriveLabCandidateConfidence({
        report: r,
        candidate: { ...base, result: { kind: "numeric", value: 4, comparator: "lt" } },
        duplicateInReport: false,
      }),
      warningCodes: [],
    });
    expect(inequality.eligible).toBe(false);
    if (!inequality.eligible) {
      expect(inequality.reasons).toContain("result_comparator_not_eq");
    }

    const badUnit = evaluateLabAutoPublish({
      report: r,
      candidate: {
        ...base,
        unit: {
          rawUnit: "widgets",
          normalizedUnit: null,
          unitRegistryVersion: "1.1.0",
          confidence: 0.4,
          known: false,
        },
      },
      reportFamilyEligible: true,
      confidence: deriveLabCandidateConfidence({
        report: r,
        candidate: {
          ...base,
          unit: {
            rawUnit: "widgets",
            normalizedUnit: null,
            unitRegistryVersion: "1.1.0",
            confidence: 0.4,
            known: false,
          },
        },
        duplicateInReport: false,
      }),
      warningCodes: ["ambiguous_unit"],
    });
    expect(badUnit.eligible).toBe(false);

    const noDate = evaluateLabAutoPublish({
      report: report({ collectedAt: null }),
      candidate: base,
      reportFamilyEligible: true,
      confidence: deriveLabCandidateConfidence({
        report: report({ collectedAt: null }),
        candidate: base,
        duplicateInReport: false,
      }),
      warningCodes: [],
    });
    expect(noDate.eligible).toBe(false);

    const historical = evaluateLabAutoPublish({
      report: r,
      candidate: {
        ...base,
        provenance: { ...base.provenance, resultRole: "historical_column" },
      },
      reportFamilyEligible: true,
      confidence: deriveLabCandidateConfidence({
        report: r,
        candidate: {
          ...base,
          provenance: { ...base.provenance, resultRole: "historical_column" },
        },
        duplicateInReport: false,
      }),
      warningCodes: [],
    });
    expect(historical.eligible).toBe(false);
  });

  it("aligns import profiles to catalog", () => {
    expect(() => assertImportProfilesCatalogAligned()).not.toThrow();
  });

  it("partitions draft into auto-publishable vs review-required", () => {
    const draft = {
      schemaVersion: "1.0.0" as const,
      id: "draft1",
      documentId: "doc1",
      userId: "u1",
      reportCandidate: report(),
      panels: [],
      results: [
        candidate({ id: "ok" }),
        candidate({
          id: "ineq",
          rawResult: "<4",
          result: { kind: "numeric", value: 4, comparator: "lt" as const },
        }),
      ],
      unmatched: [
        {
          id: "um1",
          rawAnalyteLabel: "MYSTERY",
          rawResult: "1",
          reason: "unmatched_alias" as const,
          provenance: candidate({ id: "x" }).provenance,
          confidence: 0.4,
          reviewStatus: "unresolved" as const,
        },
      ],
      warnings: [],
      parser: { id: "quest_text_pdf_v1", version: "1.1.0", extractionVersion: "1.1.0" },
      sourceChecksumSha256: checksum,
      status: "review_needed" as const,
      createdAt: iso,
    };
    const part = partitionLabCandidatesForAutoPublish(draft);
    expect(part.autoPublishable.some((x) => x.candidate.id === "ok")).toBe(true);
    expect(part.reviewRequired.some((x) => x.candidate.id === "ineq")).toBe(true);
    expect(part.unmatchedCount).toBe(1);
  });

  it("requires each confidence dimension independently (no weighted average rescue)", () => {
    const r = report();
    const base = candidate({ id: "c1" });
    const good = deriveLabCandidateConfidence({ report: r, candidate: base, duplicateInReport: false });

    const weakIdentity = evaluateLabAutoPublish({
      report: r,
      candidate: base,
      reportFamilyEligible: true,
      confidence: { ...good, analyteIdentity: 0.9 },
      warningCodes: [],
    });
    expect(weakIdentity.eligible).toBe(false);

    const weakValue = evaluateLabAutoPublish({
      report: r,
      candidate: base,
      reportFamilyEligible: true,
      confidence: { ...good, resultValue: 0.5 },
      warningCodes: [],
    });
    expect(weakValue.eligible).toBe(false);

    const weakProvenance = evaluateLabAutoPublish({
      report: r,
      candidate: base,
      reportFamilyEligible: true,
      confidence: { ...good, provenance: 0 },
      warningCodes: [],
    });
    expect(weakProvenance.eligible).toBe(false);

    const weakDup = evaluateLabAutoPublish({
      report: r,
      candidate: base,
      reportFamilyEligible: true,
      confidence: { ...good, duplicateSafety: 0 },
      warningCodes: [],
    });
    expect(weakDup.eligible).toBe(false);
  });

  it("blocks unsupported provider and image-only reports", () => {
    const r = report();
    const base = candidate({ id: "c1" });
    const conf = deriveLabCandidateConfidence({ report: r, candidate: base, duplicateInReport: false });
    expect(
      evaluateLabAutoPublish({
        report: r,
        candidate: base,
        reportFamilyEligible: false,
        confidence: conf,
        warningCodes: [],
      }).eligible,
    ).toBe(false);
    expect(
      evaluateLabAutoPublish({
        report: r,
        candidate: base,
        reportFamilyEligible: true,
        confidence: conf,
        warningCodes: ["scanned_pdf_no_text"],
      }).eligible,
    ).toBe(false);
  });
});
