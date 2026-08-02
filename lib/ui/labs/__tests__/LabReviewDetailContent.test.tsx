import React from "react";
import renderer, { act } from "react-test-renderer";

import type { LabReviewDetailDto } from "@/lib/contracts";
import { LabReviewDetailContent } from "@/lib/ui/labs/LabReviewDetailContent";
import { labReviewUiLeaksInternals } from "@/lib/ui/labs/labReviewPresentation";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function reviewFixture(): LabReviewDetailDto {
  return {
    ok: true,
    summary: {
      documentId: "doc_review_test_1",
      safeDisplayFilename: "QuestLabs.pdf",
      status: "in_progress",
      documentStatus: "review_needed",
      collectedAt: "2026-07-15T10:00:00.000Z",
      reportedAt: "2026-07-16T08:00:00.000Z",
      fasting: true,
      laboratoryName: "Quest Diagnostics",
      matchedCount: 1,
      unmatchedCount: 1,
      warningCount: 1,
      extractionVersion: "quest_text_v1_secret",
      reviewVersion: 2,
    },
    metadata: {
      laboratoryName: "Quest Diagnostics",
      collectedAt: "2026-07-15T10:00:00.000Z",
      reportedAt: "2026-07-16T08:00:00.000Z",
      fasting: true,
      specimenType: "Serum",
      panelNames: ["Comprehensive Metabolic Panel"],
      pageCount: 3,
      confidence: 0.91,
    },
    candidates: [
      {
        id: "cand_matched_1",
        rawAnalyteLabel: "GLUCOSE",
        displayName: "Glucose",
        canonicalMetricId: "glucose_fasting",
        rawResult: "92",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        unit: "mg/dL",
        rawReferenceRange: "65-99",
        flagLabel: null,
        panelName: "Comprehensive Metabolic Panel",
        sourcePage: 1,
        confidence: 0.95,
        warnings: [],
        reviewStatus: "pending_review",
        matchGroup: "matched",
      },
      {
        id: "cand_needs_review_1",
        rawAnalyteLabel: "ALT",
        displayName: "ALT",
        canonicalMetricId: "alt",
        rawResult: "45",
        result: { kind: "numeric", value: 45, comparator: "eq" },
        unit: "U/L",
        rawReferenceRange: "7-56",
        flagLabel: "H",
        panelName: "Comprehensive Metabolic Panel",
        sourcePage: 1,
        confidence: 0.72,
        warnings: ["This result may need your review."],
        reviewStatus: "pending_review",
        matchGroup: "needs_review",
      },
    ],
    unmatched: [
      {
        id: "cand_unmatched_1",
        rawAnalyteLabel: "MYSTERY ANALYTE",
        displayName: null,
        canonicalMetricId: null,
        rawResult: "1.2",
        result: null,
        unit: null,
        rawReferenceRange: null,
        flagLabel: null,
        panelName: null,
        sourcePage: 2,
        confidence: 0.4,
        warnings: ["This result needs your review."],
        reviewStatus: "pending_review",
        matchGroup: "unmatched",
      },
    ],
    warningMessages: ["Some results may need your review."],
  };
}

const noop = jest.fn();
const onEdit = jest.fn();

describe("LabReviewDetailContent", () => {
  it("renders needs review and unmatched groups with written statuses", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={reviewFixture()}
          onAcceptCandidate={noop}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(tree.root.findByProps({ testID: "lab-review-detail" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "lab-review-group-needs-review" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "lab-review-group-unmatched" })).toBeTruthy();
    expect(str).toContain("QuestLabs.pdf");
    expect(str).toContain("Glucose");
    expect(str).toContain("MYSTERY ANALYTE");
    expect(str).toContain("Pending");
    expect(str).toContain("Advanced corrections");
    expect(str).toContain("Not yet supported");
    expect(str).toContain("Report metadata");
    expect(tree.root.findByProps({ testID: "lab-review-finish" }).props.accessibilityState.disabled).toBe(true);
  });

  it("does not leak parser ids, metric ids, or extraction version", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={reviewFixture()}
          onAcceptCandidate={noop}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(labReviewUiLeaksInternals(str)).toBe(false);
    expect(str).not.toContain("quest_text_v1_secret");
    expect(str).not.toContain("extractionVersion");
    expect(str).not.toContain("parserId");
    expect(str).not.toContain("glucose_fasting");
    expect(str).not.toContain("doc_review_test_1");
  });

  it("enables finish review when at least one candidate is user_accepted", () => {
    const data = reviewFixture();
    data.candidates[0]!.reviewStatus = "user_accepted";

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={data}
          onAcceptCandidate={noop}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    expect(tree.root.findByProps({ testID: "lab-review-finish" }).props.accessibilityState.disabled).toBe(false);
  });

  it("does not enable finish review for auto_published alone", () => {
    const data = reviewFixture();
    data.candidates[0]!.reviewStatus = "auto_published";
    data.candidates[0]!.matchGroup = "matched";

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={data}
          onAcceptCandidate={noop}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    expect(tree.root.findByProps({ testID: "lab-review-finish" }).props.accessibilityState.disabled).toBe(true);
    expect(tree.root.findByProps({ testID: "lab-review-group-auto-published" })).toBeTruthy();
  });

  it("tapping Accept calls mutation handler exactly once and shows Saving while busy", () => {
    const onAccept = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={reviewFixture()}
          actionBusy
          savingCandidateId="cand_matched_1"
          onAcceptCandidate={onAccept}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    const status = tree.root.findByProps({ testID: "lab-review-candidate-status-cand_matched_1" });
    expect(JSON.stringify(status.props)).toContain("Saving");
    expect(tree.root.findByProps({ testID: "lab-review-accept-saving-cand_matched_1" })).toBeTruthy();
    const acceptBtn = tree.root.findByProps({ testID: "lab-review-accept-cand_matched_1" });
    expect(acceptBtn.props.accessibilityState.disabled).toBe(true);
    expect(acceptBtn.props.accessibilityState.busy).toBe(true);

    act(() => {
      tree.update(
        <LabReviewDetailContent
          status="ready"
          data={reviewFixture()}
          onAcceptCandidate={onAccept}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    const enabledAccept = tree.root.findByProps({ testID: "lab-review-accept-cand_matched_1" });
    act(() => {
      enabledAccept.props.onPress();
    });
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith("cand_matched_1");
  });

  it("shows Accepted after successful status change and keeps finish enabled", () => {
    const data = reviewFixture();
    data.candidates[0]!.reviewStatus = "user_accepted";
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={data}
          onAcceptCandidate={noop}
          onEditCandidate={onEdit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });
    // Expand imported section (collapsed by default).
    act(() => {
      tree.root.findByProps({ testID: "lab-review-group-auto-published-toggle" }).props.onPress();
    });
    const status = tree.root.findByProps({ testID: "lab-review-candidate-status-cand_matched_1" });
    expect(JSON.stringify(status.props)).toContain("Accepted");
    expect(tree.root.findByProps({ testID: "lab-review-selection-counts" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "lab-review-finish" }).props.accessibilityState.disabled).toBe(false);
    expect(JSON.stringify(tree.toJSON())).toContain("pending decisions");
  });

  it("opens edit modal and saves correction via onEditCandidate", () => {
    const edit = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={reviewFixture()}
          onAcceptCandidate={noop}
          onEditCandidate={edit}
          onRejectCandidate={noop}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });

    act(() => {
      tree.root.findByProps({ testID: "lab-review-edit-cand_matched_1" }).props.onPress();
    });
    expect(tree.root.findByProps({ testID: "lab-review-edit-modal" })).toBeTruthy();

    const valueInput = tree.root.findByProps({ testID: "lab-review-edit-value" });
    const flagInput = tree.root.findByProps({ testID: "lab-review-edit-flag" });
    act(() => {
      valueInput.props.onChangeText("95");
    });
    act(() => {
      flagInput.props.onChangeText("H");
    });
    act(() => {
      tree.root.findByProps({ testID: "lab-review-edit-save" }).props.onPress();
    });
    expect(edit).toHaveBeenCalledWith("cand_matched_1", { resultValueText: "95", rawFlag: "H" });
  });

  it("tapping Reject calls reject handler", () => {
    const onReject = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewDetailContent
          status="ready"
          data={reviewFixture()}
          onAcceptCandidate={noop}
          onEditCandidate={onEdit}
          onRejectCandidate={onReject}
          onSaveProgress={noop}
          onFinishReview={noop}
        />,
      );
    });
    act(() => {
      tree.root.findByProps({ testID: "lab-review-reject-cand_matched_1" }).props.onPress();
    });
    expect(onReject).toHaveBeenCalledWith("cand_matched_1");
  });
});
