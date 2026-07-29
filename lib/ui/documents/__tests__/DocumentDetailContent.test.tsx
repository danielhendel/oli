import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import type { DocumentDetailDto } from "@/lib/contracts";
import { DocumentDetailContent } from "../DocumentDetailContent";

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
  it("shows Lab report title and no Retry processing for unsupported Labs detail", () => {
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
    expect(str).not.toContain("Retry processing");
    expect(() => tree.root.findByProps({ testID: "document-reprocess" })).toThrow();
    expect(onReprocess).not.toHaveBeenCalled();
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
