/**
 * Document VM presentation for imported terminal Labs reports.
 */
import type { DocumentDetailDto, DocumentListItemDto } from "@/lib/contracts";
import {
  buildDocumentDetailViewModel,
  buildDocumentListItemViewModel,
} from "../documentViewModels";

function listItem(overrides: Partial<DocumentListItemDto> = {}): DocumentListItemDto {
  return {
    id: "doc_1",
    filename: "Report.pdf",
    domain: "labs",
    documentType: "lab_report",
    uploadedAt: "2026-08-04T15:00:00.000Z",
    status: "structured",
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
    extractionAvailability: "available",
    safeWarnings: [],
    importedCount: 84,
    reviewNeededCount: 0,
    unmatchedCount: 0,
    hasAutoPublishedResults: true,
    hasReviewItems: false,
    consumerStatus: "imported",
    consumerMessage: "84 results were added to Labs.\nNo review is required.",
    reviewActionAvailable: false,
    viewLabsActionAvailable: true,
    ...overrides,
  };
}

describe("imported terminal document presentation", () => {
  it("list row shows Imported for structured labs docs", () => {
    const vm = buildDocumentListItemViewModel(listItem({ consumerStatusLabel: "Imported" }));
    expect(vm.statusLabel).toBe("Imported");
    expect(vm.statusLabel).not.toMatch(/review/i);
  });

  it("list row shows Imported for structured without explicit label", () => {
    const vm = buildDocumentListItemViewModel(listItem({ status: "structured" }));
    expect(vm.statusLabel).toBe("Imported");
  });

  it("detail shows imported copy and hides review action", () => {
    const vm = buildDocumentDetailViewModel(detail());
    expect(vm.statusLabel).toBe("Imported");
    expect(vm.extractionMessage).toMatch(/No review is required/i);
    expect(vm.reviewActionAvailable).toBe(false);
    expect(vm.viewLabsActionAvailable).toBe(true);
  });

  it("stale review_needed with zero pending still presents as Imported", () => {
    const vm = buildDocumentDetailViewModel(
      detail({
        status: "review_needed",
        extractionAvailability: "review_needed",
        consumerStatus: undefined,
        reviewActionAvailable: undefined,
        viewLabsActionAvailable: undefined,
        consumerMessage: undefined,
      }),
    );
    expect(vm.statusLabel).toBe("Imported");
    expect(vm.reviewActionAvailable).toBe(false);
    expect(vm.extractionMessage).toMatch(/No review is required/i);
  });
});
