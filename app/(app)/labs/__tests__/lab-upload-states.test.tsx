import React from "react";
import renderer, { act } from "react-test-renderer";

import { LabUploadScreenContent } from "@/lib/ui/labs/LabUploadScreenContent";
import { DOCUMENT_PICKER_UNAVAILABLE_MESSAGE } from "@/lib/labs/expoDocumentPicker";

describe("LabUploadScreenContent states", () => {
  it("shows checking state while probing picker support", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabUploadScreenContent
          documentPickerAvailability="checking"
          state={{ phase: "idle", uploadId: null, error: null, fileName: null }}
          onPickPdf={jest.fn()}
        />,
      );
    });

    expect(tree!.root.findByProps({ testID: "lab-upload-checking" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-upload-pick-pdf" }).props.disabled).toBe(true);
  });

  it("enables Pick PDF when dynamic import probe succeeds", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabUploadScreenContent
          documentPickerAvailability="available"
          state={{ phase: "idle", uploadId: null, error: null, fileName: null }}
          onPickPdf={jest.fn()}
        />,
      );
    });

    expect(tree!.root.findByProps({ testID: "lab-upload-pick-pdf" }).props.disabled).toBe(false);
    expect(() => tree!.root.findByProps({ testID: "lab-upload-rebuild-notice" })).toThrow();
  });

  it("shows uploading state", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabUploadScreenContent
          documentPickerAvailability="available"
          state={{ phase: "uploading", uploadId: null, error: null, fileName: "labs.pdf" }}
          onPickPdf={jest.fn()}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "lab-upload-status-uploading" })).toBeTruthy();
  });

  it("shows error state", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabUploadScreenContent
          documentPickerAvailability="available"
          state={{ phase: "error", uploadId: null, error: "Only PDF files are supported.", fileName: "x.txt" }}
          onPickPdf={jest.fn()}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "lab-upload-status-error" }).props.children).toContain("PDF");
  });

  it("shows rebuild fallback when dynamic import probe fails", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabUploadScreenContent
          documentPickerAvailability="unavailable"
          state={{ phase: "idle", uploadId: null, error: null, fileName: null }}
          onPickPdf={jest.fn()}
        />,
      );
    });

    const notice = tree!.root.findByProps({ testID: "lab-upload-rebuild-notice" });
    expect(notice.props.children).toBe(DOCUMENT_PICKER_UNAVAILABLE_MESSAGE);
    expect(tree!.root.findByProps({ testID: "lab-upload-pick-pdf" }).props.disabled).toBe(true);
  });
});
