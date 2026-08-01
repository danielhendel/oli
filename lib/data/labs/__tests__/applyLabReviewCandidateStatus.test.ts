import type { LabReviewDetailDto } from "@/lib/contracts";
import {
  applyLabReviewCandidateStatus,
  countReviewActionStatuses,
} from "@/lib/data/labs/applyLabReviewCandidateStatus";

function fixture(): LabReviewDetailDto {
  return {
    ok: true,
    summary: {
      documentId: "doc_1",
      safeDisplayFilename: "Quest.pdf",
      status: "not_started",
      documentStatus: "review_needed",
      collectedAt: null,
      reportedAt: null,
      fasting: null,
      laboratoryName: null,
      matchedCount: 1,
      unmatchedCount: 1,
      warningCount: 0,
      extractionVersion: "v1",
      reviewVersion: 0,
    },
    metadata: { confidence: 0.9 },
    candidates: [
      {
        id: "cand_a",
        rawAnalyteLabel: "GLUCOSE",
        displayName: "Glucose",
        canonicalMetricId: "glucose_fasting",
        rawResult: "92",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        unit: "mg/dL",
        rawReferenceRange: "65-99",
        flagLabel: null,
        panelName: null,
        sourcePage: 1,
        confidence: 0.9,
        warnings: [],
        reviewStatus: "pending",
        matchGroup: "matched",
      },
    ],
    unmatched: [
      {
        id: "cand_b",
        rawAnalyteLabel: "MYSTERY",
        displayName: null,
        canonicalMetricId: null,
        rawResult: "1",
        result: null,
        unit: null,
        rawReferenceRange: null,
        flagLabel: null,
        panelName: null,
        sourcePage: 1,
        confidence: 0.4,
        warnings: ["needs review"],
        reviewStatus: "pending",
        matchGroup: "unmatched",
      },
    ],
    warningMessages: [],
  };
}

describe("applyLabReviewCandidateStatus", () => {
  it("marks candidate accepted and bumps review version without mutating other rows", () => {
    const next = applyLabReviewCandidateStatus(fixture(), "cand_a", "accepted", 1);
    expect(next.candidates[0]!.reviewStatus).toBe("accepted");
    expect(next.unmatched[0]!.reviewStatus).toBe("pending");
    expect(next.summary.reviewVersion).toBe(1);
    expect(next.summary.status).toBe("in_progress");
    expect(fixture().candidates[0]!.reviewStatus).toBe("pending");
  });

  it("counts accepted / rejected / unresolved for finish summary", () => {
    const data = applyLabReviewCandidateStatus(fixture(), "cand_a", "accepted", 1);
    const rejected = applyLabReviewCandidateStatus(data, "cand_b", "rejected", 2);
    expect(countReviewActionStatuses(rejected)).toEqual({
      accepted: 1,
      rejected: 1,
      corrected: 0,
      unresolved: 0,
    });
  });
});
