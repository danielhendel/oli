import React from "react";
import renderer, { act } from "react-test-renderer";

import { LabReviewQueueContent } from "../LabReviewQueueContent";
import type { LabReviewSummaryDto } from "@/lib/contracts";

const item = (overrides: Partial<LabReviewSummaryDto> = {}): LabReviewSummaryDto => ({
  documentId: "doc1",
  safeDisplayFilename: "Lab report",
  status: "imported",
  documentStatus: "structured",
  collectedAt: "2021-04-13T12:59:00.000Z",
  reportedAt: null,
  fasting: null,
  laboratoryName: "Quest Diagnostics",
  matchedCount: 2,
  unmatchedCount: 0,
  warningCount: 0,
  extractionVersion: "1.1.0",
  reviewVersion: 1,
  importedCount: 2,
  reviewNeededCount: 0,
  ...overrides,
});

describe("LabReviewQueueContent copy", () => {
  it("does not frame the list as a required review queue", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewQueueContent status="ready" items={[item()]} onPressReview={() => undefined} />,
      );
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toMatch(/review extracted results before they become structured/i);
    expect(text).toMatch(/Your imported lab reports and source details/);
    expect(text).toMatch(/2 imported/);
    expect(text).not.toMatch(/No reviews pending/i);
  });

  it("uses imported-report empty copy", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabReviewQueueContent status="ready" items={[]} onPressReview={() => undefined} />,
      );
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toMatch(/No lab reports yet/);
    expect(text).not.toMatch(/No reviews pending/);
  });
});
