import { describe, expect, it } from "@jest/globals";
import type { LabUploadDetailResponseDto } from "@/lib/contracts";
import {
  LAB_REPORT_DETAIL_FORBIDDEN_VM_KEYS,
  LAB_REPORT_DETAIL_TITLE,
  LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE,
  LAB_REPORT_ORIGINAL_DESCRIPTION,
  buildLabReportDetailViewModel,
  labReportDetailViewModelLeaksInternals,
} from "../buildLabReportDetailViewModel";

const FAKE_UID = "uid_privacy_test_abc123XYZ";
const FAKE_STORAGE_PATH = `lab-uploads/${FAKE_UID}/deadbeefhash/DirectLabs.pdf`;

function unsupportedDetail(
  overrides: Partial<LabUploadDetailResponseDto["upload"]> = {},
): LabUploadDetailResponseDto {
  return {
    ok: true,
    upload: {
      id: "upload_doc_secret_99",
      fileName: "DirectLabs.pdf",
      storagePath: FAKE_STORAGE_PATH,
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T15:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      errorMessage: LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE,
      ...overrides,
    },
    resultsByCategory: [],
    unmatchedResults: [],
    pdfUrl: null,
  };
}

describe("buildLabReportDetailViewModel", () => {
  it("builds consumer-safe unsupported report detail", () => {
    const vm = buildLabReportDetailViewModel(unsupportedDetail());
    expect(vm.title).toBe(LAB_REPORT_DETAIL_TITLE);
    expect(vm.title).toBe("Lab report");
    expect(vm.filename).toBe("DirectLabs.pdf");
    expect(vm.statusLabel).toBe("Stored securely");
    expect(vm.uploadedDateLabel).toMatch(/Jul/);
    expect(vm.uploadedDateLabel).toMatch(/2026/);
    expect(vm.extractionMessage).toBe(LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE);
    expect(vm.fileTypeLabel).toBe("PDF document");
    expect(vm.showParserCounts).toBe(false);
    expect(vm.parserCountsLabel).toBeNull();
    expect(vm.originalReport.description).toBe(LAB_REPORT_ORIGINAL_DESCRIPTION);
    expect(vm.originalReport.actionLabel).toBe("View original PDF");
    expect(vm.originalReport.actionState).toBe("coming_soon");
    expect(vm.originalReport.actionDisabled).toBe(true);
    expect(vm.originalReport.actionAvailabilityLabel).toBe("Coming soon");
    expect(vm.originalReport.accessibilityLabel).toBe("View original PDF, Coming soon");
  });

  it("never includes storage path, uid, document id, or MIME on the view model", () => {
    const vm = buildLabReportDetailViewModel(unsupportedDetail());
    const blob = JSON.stringify(vm);
    expect(blob).not.toContain(FAKE_STORAGE_PATH);
    expect(blob).not.toContain(FAKE_UID);
    expect(blob).not.toContain("lab-uploads/");
    expect(blob).not.toContain("upload_doc_secret_99");
    expect(blob).not.toContain("application/pdf");
    expect(blob).not.toMatch(/0 matched/);
    expect(blob).not.toMatch(/follow-up/i);
    expect(blob).not.toMatch(/sprint/i);
    expect(labReportDetailViewModelLeaksInternals(blob)).toBe(false);
    for (const key of LAB_REPORT_DETAIL_FORBIDDEN_VM_KEYS) {
      expect(vm).not.toHaveProperty(key);
    }
  });

  it("hides parser counters for unsupported extraction even when counters are zero", () => {
    const vm = buildLabReportDetailViewModel(
      unsupportedDetail({ matchedCount: 0, unmatchedCount: 0, extractedCount: 0 }),
    );
    expect(vm.showParserCounts).toBe(false);
    expect(vm.parserCountsLabel).toBeNull();
  });

  it("shows parser counts only after genuine structured extraction", () => {
    const vm = buildLabReportDetailViewModel({
      ok: true,
      upload: {
        id: "up1",
        fileName: "report.pdf",
        storagePath: FAKE_STORAGE_PATH,
        mimeType: "application/pdf",
        uploadedAt: "2026-07-28T15:00:00.000Z",
        status: "parsed",
        extractedCount: 5,
        matchedCount: 4,
        unmatchedCount: 1,
      },
      resultsByCategory: [],
      unmatchedResults: [],
      pdfUrl: null,
    });
    expect(vm.statusLabel).toBe("Structured");
    expect(vm.showParserCounts).toBe(true);
    expect(vm.parserCountsLabel).toBe("4 matched · 1 unmatched · 5 total");
    expect(vm.extractionMessage).toBeNull();
  });

  it("keeps Coming soon when a pdfUrl exists but viewing is not implemented", () => {
    const vm = buildLabReportDetailViewModel({
      ...unsupportedDetail(),
      pdfUrl: "https://example.invalid/signed",
    });
    expect(vm.originalReport.actionState).toBe("coming_soon");
    expect(vm.originalReport.actionDisabled).toBe(true);
    const blob = JSON.stringify(vm);
    expect(blob).not.toContain("example.invalid");
    expect(blob).not.toContain("pdfUrl");
  });
});
