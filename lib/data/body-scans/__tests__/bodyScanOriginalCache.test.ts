/**
 * B-3E-CACHE-01 — Body Scan original cache privacy lifecycle tests.
 * Synthetic paths only. No personal PDF, PHI, signed URLs, or real filenames.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockDeleteAsync = jest.fn(async () => undefined);
const mockMakeDirectoryAsync = jest.fn(async () => undefined);
const mockDownloadAsync = jest.fn(async (_url: string, fileUri: string) => ({
  status: 200,
  uri: fileUri,
}));
const mockMoveAsync = jest.fn(async () => undefined);
const mockGetInfoAsync = jest.fn(async () => ({ exists: true, size: 128, modificationTime: Date.now() / 1000 }));
const mockReadAsStringAsync = jest.fn(async () => "%PDF-");
const mockReadDirectoryAsync = jest.fn(async () => [] as string[]);

jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///docs/",
  EncodingType: { UTF8: "utf8", Base64: "base64" },
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...(args as [])),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...(args as [])),
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...(args as [string, string])),
  moveAsync: (...args: unknown[]) => mockMoveAsync(...(args as [])),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...(args as [])),
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...(args as [])),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...(args as [])),
}));

import {
  BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS,
  BODY_SCAN_ORIGINAL_CACHE_ROOT_NAME,
  assertUriInsideBodyScanRoot,
  clearAllBodyScanOriginalCaches,
  clearBodyScanOriginalCacheForAccount,
  clearBodyScanOriginalCacheForDocument,
  createBodyScanOriginalPreviewPaths,
  deleteCachedBodyScanOriginal,
  downloadBodyScanOriginalToProtectedCache,
  formatBodyScanCacheCleanupDevStatus,
  getBodyScanOriginalCacheAccountRootUri,
  getBodyScanOriginalCacheRootUri,
  opaqueAccountScopeKey,
  sanitizeBodyScanCacheSegment,
  sweepStaleBodyScanOriginalCaches,
} from "../bodyScanOriginalCache";
import { openDocumentOriginal } from "@/lib/data/documents/documentOriginalPreview";

describe("bodyScanOriginalCache path isolation", () => {
  it("gives distinct opaque roots to different accounts", () => {
    const a = opaqueAccountScopeKey("uid_account_a");
    const b = opaqueAccountScopeKey("uid_account_b");
    expect(a).not.toEqual(b);
    expect(a).not.toContain("uid_account_a");
    expect(b).not.toContain("uid_account_b");
    expect(getBodyScanOriginalCacheAccountRootUri(a)).not.toEqual(
      getBodyScanOriginalCacheAccountRootUri(b),
    );
  });

  it("isolates the same document id under two accounts", () => {
    const pathsA = createBodyScanOriginalPreviewPaths({
      userId: "uid_a",
      documentId: "doc_shared",
      previewNonce: "p1",
    });
    const pathsB = createBodyScanOriginalPreviewPaths({
      userId: "uid_b",
      documentId: "doc_shared",
      previewNonce: "p1",
    });
    expect(pathsA.finalUri).not.toEqual(pathsB.finalUri);
    expect(pathsA.directoryUri).not.toEqual(pathsB.directoryUri);
    expect(pathsA.finalUri).toContain(BODY_SCAN_ORIGINAL_CACHE_ROOT_NAME);
    expect(pathsA.finalUri).not.toContain("Live");
    expect(pathsA.finalUri).not.toContain("Lean");
    expect(pathsA.finalUri).not.toMatch(/uid_a|uid_b/);
  });

  it("sanitizes segments and rejects empty/dot-only traversal", () => {
    expect(sanitizeBodyScanCacheSegment("doc_1", "document_id")).toBe("doc_1");
    // Path separators and dots are stripped rather than interpreted.
    expect(sanitizeBodyScanCacheSegment("../etc", "document_id")).toBe("etc");
    expect(() => sanitizeBodyScanCacheSegment("..", "document_id")).toThrow();
    expect(() => sanitizeBodyScanCacheSegment("", "document_id")).toThrow();
    const paths = createBodyScanOriginalPreviewPaths({
      userId: "u1",
      documentId: "../../x",
      previewNonce: "p1",
    });
    expect(paths.documentKey).toBe("x");
    expect(paths.finalUri).toContain("/body-scans/");
    expect(paths.finalUri).not.toContain("..");
  });

  it("keeps generated paths inside the dedicated cache root", () => {
    const root = getBodyScanOriginalCacheRootUri();
    expect(root).toBe("file:///cache/body-scans/");
    const paths = createBodyScanOriginalPreviewPaths({
      userId: "u1",
      documentId: "doc1",
      previewNonce: "pnonce1",
    });
    expect(paths.finalUri.startsWith(root!)).toBe(true);
    expect(paths.partialUri.endsWith(".partial")).toBe(true);
    expect(paths.finalUri.endsWith(".pdf")).toBe(true);
    expect(() => assertUriInsideBodyScanRoot("file:///cache/other/x.pdf")).toThrow();
  });
});

describe("bodyScanOriginalCache download and cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInfoAsync.mockImplementation(async () => ({
      exists: true,
      size: 128,
      modificationTime: Date.now() / 1000,
    }));
    mockReadAsStringAsync.mockResolvedValue("%PDF-");
    mockDownloadAsync.mockImplementation(async (_url: string, fileUri: string) => ({
      status: 200,
      uri: fileUri,
    }));
  });

  it("downloads via .partial then moves to .pdf", async () => {
    const result = await downloadBodyScanOriginalToProtectedCache({
      userId: "uid_a",
      documentId: "doc1",
      url: "https://example.test/signed",
      previewNonce: "pabc",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockMakeDirectoryAsync).toHaveBeenCalled();
    expect(mockDownloadAsync).toHaveBeenCalled();
    const downloadTarget = mockDownloadAsync.mock.calls[0]![1] as string;
    expect(downloadTarget.endsWith(".partial")).toBe(true);
    expect(mockMoveAsync).toHaveBeenCalled();
    expect(result.localUri.endsWith(".pdf")).toBe(true);
  });

  it("deletes partial and final candidates on download failure", async () => {
    mockDownloadAsync.mockResolvedValueOnce({ status: 500, uri: "file:///cache/x.partial" });
    const result = await downloadBodyScanOriginalToProtectedCache({
      userId: "uid_a",
      documentId: "doc1",
      url: "https://example.test/signed",
      previewNonce: "pfail",
    });
    expect(result.ok).toBe(false);
    expect(mockDeleteAsync).toHaveBeenCalled();
  });

  it("rejects a non-PDF and deletes the candidate", async () => {
    mockReadAsStringAsync.mockResolvedValueOnce("notpdf");
    const result = await downloadBodyScanOriginalToProtectedCache({
      userId: "uid_a",
      documentId: "doc1",
      url: "https://example.test/signed",
      previewNonce: "pbad",
    });
    expect(result.ok).toBe(false);
    expect(mockDeleteAsync).toHaveBeenCalled();
  });

  it("deletes a cached original idempotently", async () => {
    await deleteCachedBodyScanOriginal("file:///cache/body-scans/a1/doc1/p1.pdf");
    await deleteCachedBodyScanOriginal("file:///cache/body-scans/a1/doc1/p1.pdf");
    expect(mockDeleteAsync).toHaveBeenCalled();
  });
});

describe("bodyScanOriginalCache account and scan lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1, modificationTime: Date.now() / 1000 });
  });

  it("clears an account namespace on logout-style cleanup", async () => {
    const status = await clearBodyScanOriginalCacheForAccount("uid_a");
    expect(status.ok).toBe(true);
    expect(mockDeleteAsync).toHaveBeenCalled();
    const deletedUri = mockDeleteAsync.mock.calls[0]![0] as string;
    expect(deletedUri).toContain("body-scans/");
    expect(deletedUri).not.toContain("uid_a");
  });

  it("clears a document namespace after scan delete", async () => {
    const status = await clearBodyScanOriginalCacheForDocument({
      userId: "uid_a",
      documentId: "doc_scan_1",
    });
    expect(status.ok).toBe(true);
    expect(mockDeleteAsync).toHaveBeenCalled();
  });

  it("clears the entire dedicated root on account deletion", async () => {
    const status = await clearAllBodyScanOriginalCaches();
    expect(status.ok).toBe(true);
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///cache/body-scans/", { idempotent: true });
  });

  it("prevents cross-account path inheritance", () => {
    const a = createBodyScanOriginalPreviewPaths({
      userId: "account_a",
      documentId: "doc1",
      previewNonce: "p1",
    });
    const b = createBodyScanOriginalPreviewPaths({
      userId: "account_b",
      documentId: "doc1",
      previewNonce: "p1",
    });
    expect(a.accountScopeKey).not.toEqual(b.accountScopeKey);
    expect(a.finalUri).not.toEqual(b.finalUri);
  });
});

describe("bodyScanOriginalCache stale sweep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes stale pdfs, abandoned partials, and malformed children; leaves recent files", async () => {
    const now = Date.now();
    const staleMod = (now - BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS - 60_000) / 1000;
    const freshMod = now / 1000;

    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      if (uri === "file:///cache/body-scans/") return { exists: true, isDirectory: true };
      if (String(uri).endsWith("stale.pdf")) {
        return { exists: true, size: 10, modificationTime: staleMod };
      }
      if (String(uri).endsWith("fresh.pdf")) {
        return { exists: true, size: 10, modificationTime: freshMod };
      }
      if (String(uri).endsWith(".partial")) {
        return { exists: true, size: 10, modificationTime: freshMod };
      }
      if (String(uri).endsWith("weird.bin")) {
        return { exists: true, size: 10, modificationTime: freshMod };
      }
      return { exists: true, size: 0, modificationTime: freshMod };
    });

    mockReadDirectoryAsync
      .mockResolvedValueOnce(["ascope"]) // accounts
      .mockResolvedValueOnce(["doc1"]) // documents
      .mockResolvedValueOnce(["stale.pdf", "fresh.pdf", "orphan.partial", "weird.bin"])
      .mockResolvedValueOnce(["fresh.pdf"]); // remaining after deletes

    const status = await sweepStaleBodyScanOriginalCaches({ now: () => now });
    expect(status.ok).toBe(true);
    const deleted = mockDeleteAsync.mock.calls.map((c) => String(c[0]));
    expect(deleted.some((u) => u.endsWith("stale.pdf"))).toBe(true);
    expect(deleted.some((u) => u.endsWith("orphan.partial"))).toBe(true);
    expect(deleted.some((u) => u.endsWith("weird.bin"))).toBe(true);
    expect(deleted.some((u) => u.endsWith("fresh.pdf"))).toBe(false);
  });

  it("formats safe cleanup status without paths or ids", () => {
    expect(formatBodyScanCacheCleanupDevStatus({ ok: true, deletedCountBucket: "2_5" })).toContain(
      "bucket=2_5",
    );
    expect(formatBodyScanCacheCleanupDevStatus({ ok: false, reasonCode: "SWEEP_FAILED" })).not.toContain(
      "file://",
    );
  });
});

describe("openDocumentOriginal + cache cleanup integration", () => {
  it("successful dismiss-style preview deletes the local file", async () => {
    const deleteLocal = jest.fn(async () => undefined);
    const outcome = await openDocumentOriginal({
      requestGrant: async () => ({
        ok: true,
        available: true,
        url: "https://storage.example.test/signed",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        mediaType: "application/pdf",
        filename: "ignored.pdf",
      }),
      downloadToProtectedPath: async () => ({
        ok: true,
        localUri: "file:///cache/body-scans/a/doc/p.pdf",
      }),
      openLocal: async () => ({ opened: true, deleteImmediately: true }),
      deleteLocal,
    });
    expect(outcome).toEqual({ status: "opened" });
    expect(deleteLocal).toHaveBeenCalledTimes(1);
  });

  it("failed download never leaves a local uri for open", async () => {
    const openLocal = jest.fn(async () => ({ opened: true, deleteImmediately: true }));
    const outcome = await openDocumentOriginal({
      requestGrant: async () => ({
        ok: true,
        available: true,
        url: "https://storage.example.test/signed",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        mediaType: "application/pdf",
        filename: "ignored.pdf",
      }),
      downloadToProtectedPath: async () => ({ ok: false }),
      openLocal,
    });
    expect(outcome).toEqual({ status: "error", code: "DOWNLOAD_FAILED" });
    expect(openLocal).not.toHaveBeenCalled();
  });
});
