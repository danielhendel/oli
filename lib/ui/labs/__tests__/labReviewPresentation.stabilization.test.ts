/**
 * UI copy / date formatting for signed-in Labs stabilization.
 */
import { describe, expect, it } from "@jest/globals";
import { formatReviewDate, reviewSummaryCountsLabel } from "../labReviewPresentation";
import { formatLabUploadDate } from "../labUploadStatusLabel";

describe("lab review presentation dates and counts", () => {
  it("formats source calendar dates without local day shift", () => {
    expect(formatReviewDate("2024-10-15T00:00:00.000Z")).toBe("Oct 15, 2024");
    expect(formatReviewDate("2024-10-26T13:29:00.000Z")).toBe("Oct 26, 2024");
    expect(formatLabUploadDate("2024-10-15T06:16:00.000Z")).toBe("Oct 15, 2024");
  });

  it("labels classified rows instead of need review when pending decisions are zero", () => {
    expect(
      reviewSummaryCountsLabel({
        documentId: "d",
        safeDisplayFilename: "Report.pdf",
        status: "imported",
        documentStatus: "parsed",
        collectedAt: null,
        reportedAt: null,
        fasting: null,
        laboratoryName: null,
        matchedCount: 84,
        unmatchedCount: 5,
        warningCount: 0,
        extractionVersion: "1.2.0",
        reviewVersion: 1,
        importedCount: 84,
        reviewNeededCount: 0,
      }),
    ).toBe("84 imported / 5 report rows classified");
  });
});
