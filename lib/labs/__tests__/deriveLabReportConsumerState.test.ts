/**
 * Tests for Labs imported terminal consumer state.
 */
import {
  deriveLabReportConsumerState,
  deriveLabReportConsumerPresentation,
  shouldPersistLabDocumentTerminalStatus,
} from "../deriveLabReportConsumerState";

describe("deriveLabReportConsumerState", () => {
  it("imported + zero pending → imported", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "review_needed",
        importedCount: 84,
        genuinePendingDecisionCount: 0,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 0,
      }),
    ).toBe("imported");
  });

  it("imported + classified notes only → imported_with_notes", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "structured",
        importedCount: 84,
        genuinePendingDecisionCount: 0,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 5,
      }),
    ).toBe("imported_with_notes");
  });

  it("imported + withheld results → imported_with_withheld_results", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "review_needed",
        importedCount: 10,
        genuinePendingDecisionCount: 0,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 2,
        classifiedReportRowCount: 0,
      }),
    ).toBe("imported_with_withheld_results");
  });

  it("genuine pending → review_available", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "structured",
        importedCount: 5,
        genuinePendingDecisionCount: 3,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 0,
      }),
    ).toBe("review_available");
  });

  it("unsupported report → unsupported", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "unsupported",
        importedCount: 0,
        genuinePendingDecisionCount: 0,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 0,
      }),
    ).toBe("unsupported");
  });

  it("failure → failed", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "failed",
        importedCount: 0,
        genuinePendingDecisionCount: 0,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 0,
      }),
    ).toBe("failed");
  });

  it("stale internal review_needed + zero pending → imported", () => {
    const presentation = deriveLabReportConsumerPresentation({
      processingStatus: "review_needed",
      importedCount: 84,
      genuinePendingDecisionCount: 0,
      unmatchedGenuineAnalyteCount: 0,
      withheldGenuineResultCount: 0,
      classifiedReportRowCount: 0,
    });
    expect(presentation.consumerStatus).toBe("imported");
    expect(presentation.statusLabel).toBe("Imported");
    expect(presentation.reviewActionAvailable).toBe(false);
    expect(presentation.viewLabsActionAvailable).toBe(true);
    expect(presentation.documentRecordStatus).toBe("structured");
    expect(
      shouldPersistLabDocumentTerminalStatus({
        currentDocumentStatus: "review_needed",
        presentation,
      }),
    ).toBe(true);
  });

  it("no imported results + pending candidates → review_available", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "review_needed",
        importedCount: 0,
        genuinePendingDecisionCount: 4,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 0,
      }),
    ).toBe("review_available");
  });

  it("classified/duplicate/reference do not create review_available without pending", () => {
    expect(
      deriveLabReportConsumerState({
        processingStatus: "review_needed",
        importedCount: 84,
        genuinePendingDecisionCount: 0,
        unmatchedGenuineAnalyteCount: 0,
        withheldGenuineResultCount: 0,
        classifiedReportRowCount: 12,
      }),
    ).toBe("imported_with_notes");
  });

  it("does not promote failed/unsupported incorrectly", () => {
    expect(
      shouldPersistLabDocumentTerminalStatus({
        currentDocumentStatus: "failed",
        presentation: deriveLabReportConsumerPresentation({
          processingStatus: "failed",
          importedCount: 0,
          genuinePendingDecisionCount: 0,
          unmatchedGenuineAnalyteCount: 0,
          withheldGenuineResultCount: 0,
          classifiedReportRowCount: 0,
        }),
      }),
    ).toBe(false);
  });
});
