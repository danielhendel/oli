/**
 * Body Scan local preview + PDFKit wrapper tests.
 * Mocks the native module; never uses a real personal PDF.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPresentSecurePdfPreview = jest.fn(async () => ({
  ok: true as const,
  method: "pdfkit" as const,
  settlement: "dismissed" as const,
  deleteImmediately: true as const,
}));
const mockIsAvailable = jest.fn(() => true);

jest.mock("oli-secure-pdf-preview", () => ({
  isOliSecurePdfPreviewAvailable: () => mockIsAvailable(),
  presentSecurePdfPreview: (...a: unknown[]) => mockPresentSecurePdfPreview(...(a as [])),
}));

const mockOpenBrowserAsync = jest.fn(async () => undefined);
const mockCanOpenURL = jest.fn(async () => false);
const mockOpenURL = jest.fn(async () => undefined);

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (...a: unknown[]) => mockOpenBrowserAsync(...(a as [])),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Linking: {
    canOpenURL: (...a: unknown[]) => mockCanOpenURL(...(a as [])),
    openURL: (...a: unknown[]) => mockOpenURL(...(a as [])),
  },
}));

import {
  nativePdfPreviewUnavailableDevMessage,
  openBodyScanOriginalLocalPreview,
} from "../openBodyScanOriginalLocalPreview";

describe("openBodyScanOriginalLocalPreview (iOS PDFKit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable.mockReturnValue(true);
    mockPresentSecurePdfPreview.mockResolvedValue({
      ok: true,
      method: "pdfkit",
      settlement: "dismissed",
      deleteImmediately: true,
    });
  });

  it("uses native PDFKit and settles dismissed with deleteImmediately", async () => {
    const result = await openBodyScanOriginalLocalPreview(
      "file:///cache/body-scans/a/d/p.pdf",
      { title: "Original Report" },
    );
    expect(mockPresentSecurePdfPreview).toHaveBeenCalledWith({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
      title: "Original Report",
    });
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      opened: true,
      method: "pdfkit",
      settlement: "dismissed",
      deleteImmediately: true,
    });
  });

  it("returns native_preview_unavailable when module is absent", async () => {
    mockIsAvailable.mockReturnValue(false);
    const result = await openBodyScanOriginalLocalPreview("file:///cache/body-scans/a/d/p.pdf");
    expect(mockPresentSecurePdfPreview).not.toHaveBeenCalled();
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.safeReasonCode).toBe("native_preview_unavailable");
      expect(result.deleteImmediately).toBe(true);
    }
    expect(nativePdfPreviewUnavailableDevMessage()).toMatch(/Rebuild the development client/);
  });

  it("maps fixed native failure codes without raw error text", async () => {
    mockPresentSecurePdfPreview.mockResolvedValue({
      ok: false,
      safeReasonCode: "outside_allowed_cache_root",
    });
    const result = await openBodyScanOriginalLocalPreview("file:///cache/body-scans/a/d/p.pdf");
    expect(result.ok).toBe(false);
    const json = JSON.stringify(result);
    expect(json).not.toContain("file://");
    expect(json).not.toContain("Error");
    if (!result.ok) {
      expect(result.safeReasonCode).toBe("outside_allowed_cache_root");
    }
  });

  it("never calls WebBrowser or Linking on iOS", async () => {
    mockPresentSecurePdfPreview.mockResolvedValue({
      ok: false,
      safeReasonCode: "pdf_invalid",
    });
    await openBodyScanOriginalLocalPreview("file:///cache/body-scans/a/d/p.pdf");
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(mockCanOpenURL).not.toHaveBeenCalled();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it("rejects empty uri as local_pdf_invalid", async () => {
    const result = await openBodyScanOriginalLocalPreview("");
    expect(result).toEqual({
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: "local_pdf_invalid",
    });
    expect(mockPresentSecurePdfPreview).not.toHaveBeenCalled();
  });
});
