import React from "react";
import renderer, { act } from "react-test-renderer";

import type { LabUploadDetailResponseDto } from "@/lib/contracts";
import { LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE } from "@/lib/data/labs/buildLabReportDetailViewModel";
import { LabUploadDetailContent } from "@/lib/ui/labs/LabUploadDetailContent";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const FAKE_UID = "uid_device_leak_test_9f3a";
const FAKE_PATH = `lab-uploads/${FAKE_UID}/abc123hash/DirectLabs.pdf`;

function unsupportedFixture(): LabUploadDetailResponseDto {
  return {
    ok: true,
    upload: {
      id: "doc_internal_id_should_not_render",
      fileName: "DirectLabs.pdf",
      storagePath: FAKE_PATH,
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T18:30:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      errorMessage: LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE,
    },
    resultsByCategory: [],
    unmatchedResults: [],
    pdfUrl: null,
  };
}

describe("LabUploadDetailContent privacy", () => {
  it("renders consumer lab report detail without internals", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabUploadDetailContent status="ready" data={unsupportedFixture()} />,
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(tree.root.findByProps({ testID: "lab-report-detail" })).toBeTruthy();
    expect(str).toContain("DirectLabs.pdf");
    expect(str).toContain("Stored securely");
    expect(str).toMatch(/Uploaded .*2026/);
    expect(str).toContain(LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE);
    expect(str).toContain("Original report");
    expect(str).toContain("Your original PDF is stored securely with your account.");
    expect(str).toContain("View original PDF");
    expect(str).toContain("Coming soon");
    expect(str).toContain("PDF document");

    expect(str).not.toContain(FAKE_PATH);
    expect(str).not.toContain(FAKE_UID);
    expect(str).not.toContain("lab-uploads/");
    expect(str).not.toContain("doc_internal_id_should_not_render");
    expect(str).not.toContain("application/pdf");
    expect(str).not.toMatch(/MIME:/i);
    expect(str).not.toMatch(/0 matched/);
    expect(str).not.toMatch(/unmatched/);
    expect(str).not.toMatch(/0 total/);
    expect(str).not.toMatch(/follow-up/i);
    expect(str).not.toMatch(/sprint/i);
    expect(str).not.toMatch(/Signed PDF/i);
    expect(str).not.toMatch(/Storage:/i);

    const action = tree.root.findByProps({ testID: "lab-report-view-original" });
    expect(action.props.disabled).toBe(true);
    expect(action.props.accessibilityLabel).toBe("View original PDF, Coming soon");
    expect(action.props.accessibilityLabel).not.toContain(FAKE_UID);
    expect(action.props.accessibilityLabel).not.toContain("lab-uploads");
  });

  it("does not render raw storage path from a synthetic uid-bearing fixture", () => {
    const fixture = unsupportedFixture();
    fixture.upload.storagePath = `lab-uploads/${FAKE_UID}/zzzz/Secret.pdf`;
    fixture.upload.fileName = "Secret.pdf";

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabUploadDetailContent status="ready" data={fixture} />);
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Secret.pdf");
    expect(str).not.toContain(FAKE_UID);
    expect(str).not.toContain("lab-uploads/");
    expect(str).not.toContain("zzzz");
  });
});
