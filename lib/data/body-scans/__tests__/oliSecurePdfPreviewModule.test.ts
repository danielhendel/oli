/**
 * TypeScript wrapper tests for oli-secure-pdf-preview (native module present).
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPresentAsync = jest.fn();

jest.mock("expo", () => ({
  requireOptionalNativeModule: (name: string) => {
    if (name !== "OliSecurePdfPreview") return null;
    return {
      presentAsync: (...a: unknown[]) => mockPresentAsync(...(a as [])),
    };
  },
}));

import {
  isOliSecurePdfPreviewAvailable,
  presentSecurePdfPreview,
} from "oli-secure-pdf-preview";

describe("oli-secure-pdf-preview wrapper (native present)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports available when native module is linked", async () => {
    mockPresentAsync.mockResolvedValue({
      ok: true,
      method: "pdfkit",
      settlement: "dismissed",
      deleteImmediately: true,
    });
    expect(isOliSecurePdfPreviewAvailable()).toBe(true);
    const result = await presentSecurePdfPreview({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
    });
    expect(result).toEqual({
      ok: true,
      method: "pdfkit",
      settlement: "dismissed",
      deleteImmediately: true,
    });
  });

  it("maps unknown native shapes to unknown_native_preview_failure", async () => {
    mockPresentAsync.mockResolvedValue({ ok: true, method: "something_else" });
    const result = await presentSecurePdfPreview({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
    });
    expect(result).toEqual({
      ok: false,
      safeReasonCode: "unknown_native_preview_failure",
    });
  });

  it("swallows thrown native errors into a fixed safe code", async () => {
    mockPresentAsync.mockRejectedValue(new Error("NSInternalInconsistency file:///secret.pdf"));
    const result = await presentSecurePdfPreview({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain("file://");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("NSInternal");
    expect(result).toEqual({
      ok: false,
      safeReasonCode: "unknown_native_preview_failure",
    });
  });

  it("rejects empty localUri without calling native", async () => {
    const result = await presentSecurePdfPreview({ localUri: "" });
    expect(mockPresentAsync).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      safeReasonCode: "invalid_file_uri",
    });
  });

  it("passes through allowed failure codes only", async () => {
    mockPresentAsync.mockResolvedValue({
      ok: false,
      safeReasonCode: "preview_already_presented",
    });
    const result = await presentSecurePdfPreview({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
    });
    expect(result).toEqual({
      ok: false,
      safeReasonCode: "preview_already_presented",
    });
  });

  it("drops unknown failure codes", async () => {
    mockPresentAsync.mockResolvedValue({
      ok: false,
      safeReasonCode: "raw_swift_exception_path_/var/secret",
    });
    const result = await presentSecurePdfPreview({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
    });
    expect(result).toEqual({
      ok: false,
      safeReasonCode: "unknown_native_preview_failure",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
