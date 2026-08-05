import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import type { DocumentDetailDto } from "@/lib/contracts";
import {
  DOCUMENT_NOT_FOUND_ACTION_LABEL,
  DOCUMENT_NOT_FOUND_MESSAGE,
  DOCUMENT_NOT_FOUND_TITLE,
  DocumentDetailContent,
} from "../DocumentDetailContent";

function detail(overrides: Partial<DocumentDetailDto> = {}): DocumentDetailDto {
  return {
    id: "doc_detail_1",
    filename: "DirectLabs.pdf",
    domain: "labs",
    documentType: "lab_report",
    uploadedAt: "2026-07-28T15:00:00.000Z",
    status: "unsupported",
    processingState: null,
    extractionAvailability: "unavailable",
    safeWarnings: ["This document is stored, but structured extraction is not available yet."],
    canViewOriginal: false,
    canRetry: false,
    canDelete: true,
    legacySource: "document",
    ...overrides,
  };
}

describe("DocumentDetailContent", () => {
  it("shows Reprocess report for unsupported Labs detail and invokes handler", () => {
    const onReprocess = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent
          status="ready"
          document={detail({ status: "unsupported", canRetry: true })}
          onReprocess={onReprocess}
        />,
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Lab report");
    expect(str).toContain("Extraction unavailable");
    expect(str).toMatch(/not available yet/i);
    expect(str).toContain("Reprocess report");
    expect(str).not.toContain("Retry processing");
    const button = tree.root.findByProps({ testID: "document-reprocess" });
    act(() => {
      button.props.onPress();
    });
    expect(onReprocess).toHaveBeenCalledTimes(1);
  });

  it("shows Retry processing for failed retryable extraction and invokes handler", () => {
    const onReprocess = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent
          status="ready"
          document={detail({
            status: "failed",
            canRetry: true,
            safeWarnings: ["Processing failed. Retry is available."],
          })}
          onReprocess={onReprocess}
        />,
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Retry processing");
    const button = tree.root.findByProps({ testID: "document-reprocess" });
    act(() => {
      button.props.onPress();
    });
    expect(onReprocess).toHaveBeenCalledTimes(1);
  });

  it("maps not_found to consumer-safe copy without loading or raw 404", () => {
    const onBack = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent status="not_found" onBackToList={onBack} />,
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("Loading document");
    expect(str).not.toContain("404");
    expect(str).not.toContain("requestId");
    expect(str).not.toContain("doc_detail_1");
    expect(str).toContain(DOCUMENT_NOT_FOUND_TITLE);
    expect(str).toContain(DOCUMENT_NOT_FOUND_MESSAGE);
    expect(str).toContain(DOCUMENT_NOT_FOUND_ACTION_LABEL);
    const back = tree.root.findByProps({ testID: "document-detail-back-to-list" });
    act(() => {
      back.props.onPress();
    });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps retryable server errors distinct from not_found", () => {
    const onRetry = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent
          status="error"
          error="Could not load document"
          requestId="req_test"
          onRetryLoad={onRetry}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain(DOCUMENT_NOT_FOUND_TITLE);
    expect(str).not.toContain("Loading document");
    expect(str).toContain("Could not load document");
  });

  it("shows Delete document for legacy lab_upload detail", () => {
    const onDelete = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent
          status="ready"
          document={detail({
            id: "lab:upload_legacy",
            legacySource: "lab_upload",
            canDelete: true,
            status: "unsupported",
          })}
          onDelete={onDelete}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Delete document");
    expect(str).not.toContain("lab:upload_legacy");
    expect(str).not.toContain("labUploads");
    const button = tree.root.findByProps({ testID: "document-delete" });
    expect(button.props.accessibilityState).toEqual({ disabled: false });
    act(() => {
      button.props.onPress();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables Delete while deleteBusy to prevent repeated taps", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent
          status="ready"
          document={detail({ canDelete: true })}
          onDelete={() => undefined}
          deleteBusy
        />,
      );
    });
    const button = tree.root.findByProps({ testID: "document-delete" });
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(JSON.stringify(tree.toJSON())).toContain("Deleting…");
  });

  it("keeps DirectLabs filename privacy-safe without storage internals", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentDetailContent status="ready" document={detail({ filename: "DirectLabs.pdf" })} />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("DirectLabs.pdf");
    expect(str).toContain("Lab report");
    expect(str).not.toContain("storagePath");
    expect(str).not.toContain("users/");
    expect(str).not.toContain("checksum");
  });
});
