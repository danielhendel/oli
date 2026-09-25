import { describe, expect, it, jest } from "@jest/globals";
import type { DocumentViewOriginalResponseDto } from "@oli/contracts";

import {
  documentOriginalPreviewMessage,
  openDocumentOriginal,
  protectedOriginalCacheFilename,
  type DocumentOriginalPreviewEffects,
} from "../documentOriginalPreview";

const GRANT: DocumentViewOriginalResponseDto = {
  ok: true,
  available: true,
  url: "https://storage.example.test/signed?token=abc",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  mediaType: "application/pdf",
  filename: "body-scan.pdf",
};

function effects(overrides: Partial<DocumentOriginalPreviewEffects> = {}): DocumentOriginalPreviewEffects {
  return {
    requestGrant: async () => GRANT,
    downloadToProtectedPath: async () => ({ ok: true, localUri: "file:///cache/original-doc1.pdf" }),
    openLocal: async () => ({ opened: true, deleteImmediately: true }),
    ...overrides,
  };
}

describe("openDocumentOriginal", () => {
  it("downloads to a protected path and opens the local file", async () => {
    const downloadToProtectedPath = jest.fn(
      async () => ({ ok: true, localUri: "file:///cache/original-doc1.pdf" }) as const,
    );
    const openLocal = jest.fn(async () => ({ opened: true, deleteImmediately: true }));
    const deleteLocal = jest.fn(async () => undefined);

    const outcome = await openDocumentOriginal(
      effects({ downloadToProtectedPath, openLocal, deleteLocal }),
    );

    expect(outcome).toEqual({ status: "opened" });
    expect(downloadToProtectedPath).toHaveBeenCalledWith({
      url: GRANT.url,
      filename: "body-scan.pdf",
    });
    // The system preview only ever sees the local file, never the bearer URL.
    expect(openLocal).toHaveBeenCalledWith("file:///cache/original-doc1.pdf");
    expect(deleteLocal).toHaveBeenCalledWith("file:///cache/original-doc1.pdf");
  });

  it("leaves the file when the open API does not wait for dismiss", async () => {
    const deleteLocal = jest.fn(async () => undefined);
    const outcome = await openDocumentOriginal(
      effects({
        openLocal: async () => ({ opened: true, deleteImmediately: false }),
        deleteLocal,
      }),
    );
    expect(outcome).toEqual({ status: "opened" });
    expect(deleteLocal).not.toHaveBeenCalled();
  });

  it("deletes the local file after an open failure", async () => {
    const deleteLocal = jest.fn(async () => undefined);
    const outcome = await openDocumentOriginal(
      effects({
        openLocal: async () => ({ opened: false, deleteImmediately: true }),
        deleteLocal,
      }),
    );
    expect(outcome).toEqual({ status: "error", code: "OPEN_FAILED" });
    expect(deleteLocal).toHaveBeenCalledWith("file:///cache/original-doc1.pdf");
  });

  it("reports the server reason when no grant is available", async () => {
    const outcome = await openDocumentOriginal(
      effects({
        requestGrant: async () => ({
          ok: true,
          available: false,
          reasonCode: "VIEW_ORIGINAL_NOT_STORED",
        }),
      }),
    );
    expect(outcome).toEqual({ status: "unavailable", reasonCode: "VIEW_ORIGINAL_NOT_STORED" });
  });

  it("does not attempt a download with an already-expired grant", async () => {
    const downloadToProtectedPath = jest.fn(async () => ({ ok: false }) as const);
    const outcome = await openDocumentOriginal(
      effects({
        requestGrant: async () => ({ ...GRANT, expiresAt: new Date(Date.now() - 1000).toISOString() }),
        downloadToProtectedPath,
      }),
    );
    expect(outcome).toEqual({ status: "error", code: "EXPIRED" });
    expect(downloadToProtectedPath).not.toHaveBeenCalled();
  });

  it("surfaces download and open failures distinctly", async () => {
    await expect(
      openDocumentOriginal(effects({ downloadToProtectedPath: async () => ({ ok: false }) })),
    ).resolves.toEqual({ status: "error", code: "DOWNLOAD_FAILED" });

    await expect(
      openDocumentOriginal(
        effects({ openLocal: async () => ({ opened: false, deleteImmediately: true }) }),
      ),
    ).resolves.toEqual({ status: "error", code: "OPEN_FAILED" });

    await expect(
      openDocumentOriginal(effects({ requestGrant: async () => null })),
    ).resolves.toEqual({ status: "error", code: "GRANT_FAILED" });
  });

  it("keeps user-facing copy free of URLs and reason codes", () => {
    const messages = [
      documentOriginalPreviewMessage({ status: "unavailable", reasonCode: "VIEW_ORIGINAL_NOT_STORED" }),
      documentOriginalPreviewMessage({ status: "unavailable", reasonCode: "VIEW_ORIGINAL_UNAVAILABLE" }),
      documentOriginalPreviewMessage({ status: "error", code: "EXPIRED" }),
      documentOriginalPreviewMessage({ status: "error", code: "DOWNLOAD_FAILED" }),
    ];
    for (const message of messages) {
      expect(message).toBeTruthy();
      expect(message).not.toContain("http");
      expect(message).not.toContain("VIEW_ORIGINAL");
    }
    expect(documentOriginalPreviewMessage({ status: "opened" })).toBeNull();
  });

  it("derives the legacy cache filename from the document id, not the report name", () => {
    expect(
      protectedOriginalCacheFilename({ documentId: "doc/../1", mediaType: "application/pdf" }),
    ).toBe("original-doc1.pdf");
  });
});
