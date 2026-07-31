import { describe, expect, it } from "@jest/globals";
import type { DocumentDetailDto, DocumentListItemDto } from "@/lib/contracts";
import { DOCUMENT_STATUS_LABELS } from "../documentStatus";
import {
  DOCUMENT_DETAIL_FORBIDDEN_VM_KEYS,
  buildDocumentDetailViewModel,
  buildDocumentListItemViewModel,
  documentViewModelLeaksInternals,
} from "../documentViewModels";

const FAKE_UID = "uid_privacy_test_abc123XYZ";
const FAKE_STORAGE_PATH = `users/${FAKE_UID}/documents/deadbeef/Report.pdf`;
const FAKE_CHECKSUM = "e".repeat(64);

function listItem(overrides: Partial<DocumentListItemDto> = {}): DocumentListItemDto {
  return {
    id: "doc_safe_1",
    filename: "Report.pdf",
    domain: "labs",
    documentType: "lab_report",
    uploadedAt: "2026-07-28T15:00:00.000Z",
    status: "unsupported",
    canViewOriginal: false,
    canRetry: false,
    canDelete: true,
    legacySource: "document",
    ...overrides,
  };
}

function detail(overrides: Partial<DocumentDetailDto> = {}): DocumentDetailDto {
  return {
    ...listItem(),
    processingState: null,
    extractionAvailability: "unavailable",
    safeWarnings: ["This document is stored, but structured extraction is not available yet."],
    ...overrides,
  };
}

describe("buildDocumentListItemViewModel", () => {
  it("exposes only safe presentation metadata", () => {
    const vm = buildDocumentListItemViewModel(listItem());
    expect(vm).toEqual({
      id: "doc_safe_1",
      filename: "Report.pdf",
      domainLabel: "Labs",
      documentTypeLabel: "Lab report",
      uploadedDateLabel: expect.stringMatching(/2026/),
      statusLabel: DOCUMENT_STATUS_LABELS.unsupported,
      canRetry: false,
      canDelete: true,
      canViewOriginal: false,
    });
    for (const key of DOCUMENT_DETAIL_FORBIDDEN_VM_KEYS) {
      expect(vm).not.toHaveProperty(key);
    }
  });

  it("does not mark unsupported list rows as retryable even if DTO canRetry is stale true", () => {
    const vm = buildDocumentListItemViewModel(listItem({ status: "unsupported", canRetry: true }));
    expect(vm.canRetry).toBe(false);
  });
});

describe("buildDocumentDetailViewModel", () => {
  it("uses Lab report as the Labs consumer/navigation title", () => {
    const vm = buildDocumentDetailViewModel(detail({ domain: "labs", documentType: "lab_report" }));
    expect(vm.consumerTitle).toBe("Lab report");
    expect(vm.title).toBe("Lab report");
  });

  it("retains Document as the generic non-Labs consumer title", () => {
    const vm = buildDocumentDetailViewModel(
      detail({
        domain: "other_health_record",
        documentType: "unknown",
        status: "stored",
        canRetry: false,
        safeWarnings: [],
      }),
    );
    expect(vm.consumerTitle).toBe("Document");
  });

  it("builds consumer-safe detail with status labels and coming-soon original action", () => {
    const vm = buildDocumentDetailViewModel(
      detail({ status: "failed", canRetry: true, safeWarnings: ["Boom"] }),
    );
    expect(vm.title).toBe("Lab report");
    expect(vm.statusLabel).toBe(DOCUMENT_STATUS_LABELS.failed);
    expect(vm.extractionMessage).toBe("Boom");
    expect(vm.canRetryProcessing).toBe(true);
    expect(vm.retryLabel).toBe("Retry processing");
    expect(vm.originalFile.actionLabel).toBe("View original");
    expect(vm.originalFile.actionDisabled).toBe(true);
    expect(vm.originalFile.actionAvailabilityLabel).toBe("Coming soon");
  });

  it("does not expose retry for unsupported extraction", () => {
    const vm = buildDocumentDetailViewModel(
      detail({
        status: "unsupported",
        canRetry: true, // stale/over-permissive DTO must not drive consumer retry
        safeWarnings: ["This document is stored, but structured extraction is not available yet."],
      }),
    );
    expect(vm.statusLabel).toBe("Extraction unavailable");
    expect(vm.extractionMessage).toMatch(/not available yet/i);
    expect(vm.canRetry).toBe(false);
    expect(vm.canRetryProcessing).toBe(false);
    expect(vm.retryLabel).toBeNull();
  });

  it("exposes retry for failed retryable extraction", () => {
    const vm = buildDocumentDetailViewModel(
      detail({ status: "failed", canRetry: true, safeWarnings: ["Processing failed. Retry is available."] }),
    );
    expect(vm.canRetryProcessing).toBe(true);
    expect(vm.retryLabel).toBe("Retry processing");
  });

  it("maps status labels for common record statuses", () => {
    expect(buildDocumentDetailViewModel(detail({ status: "stored" })).statusLabel).toBe(
      "Stored securely",
    );
    expect(buildDocumentDetailViewModel(detail({ status: "processing" })).statusLabel).toBe(
      "Processing",
    );
    expect(buildDocumentDetailViewModel(detail({ status: "review_needed" })).statusLabel).toBe(
      "Review needed",
    );
    expect(buildDocumentDetailViewModel(detail({ status: "unsupported" })).statusLabel).toBe(
      "Extraction unavailable",
    );
  });

  it("does not leak paths, checksums, or parser internals", () => {
    const vm = buildDocumentDetailViewModel(
      detail({
        safeWarnings: ["Extraction is not available yet."],
      }),
    );
    const blob = JSON.stringify(vm);
    expect(blob).not.toContain(FAKE_STORAGE_PATH);
    expect(blob).not.toContain(FAKE_UID);
    expect(blob).not.toContain(FAKE_CHECKSUM);
    expect(blob).not.toContain("parserId");
    expect(blob).not.toContain("application/pdf");
    expect(documentViewModelLeaksInternals(blob)).toBe(false);
    for (const key of DOCUMENT_DETAIL_FORBIDDEN_VM_KEYS) {
      expect(vm).not.toHaveProperty(key);
    }
  });
});

describe("documentViewModelLeaksInternals", () => {
  it("detects storage paths, checksums, parser ids, and uids", () => {
    expect(documentViewModelLeaksInternals(FAKE_STORAGE_PATH)).toBe(true);
    expect(documentViewModelLeaksInternals("lab-uploads/uid/hash/file.pdf")).toBe(true);
    expect(documentViewModelLeaksInternals(`checksum=${FAKE_CHECKSUM}`)).toBe(true);
    expect(documentViewModelLeaksInternals("parserId:noop")).toBe(true);
    expect(documentViewModelLeaksInternals("parserVersion:1.0.0")).toBe(true);
    expect(documentViewModelLeaksInternals("application/pdf")).toBe(true);
    expect(documentViewModelLeaksInternals(`user uid ${FAKE_UID} profile`)).toBe(true);
    expect(documentViewModelLeaksInternals('{"filename":"Report.pdf","statusLabel":"Stored securely"}')).toBe(
      false,
    );
  });
});
