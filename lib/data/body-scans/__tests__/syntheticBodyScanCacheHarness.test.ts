import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES,
  buildInvalidSyntheticBodyScanCacheBytes,
  buildSyntheticBodyScanCachePdfBytes,
  syntheticBodyScanCachePdfContainsOnlyApprovedText,
  uint8ToBase64,
} from "../syntheticBodyScanCachePdf";
import {
  BODY_SCAN_CACHE_DEV_EVENT_PREFIX,
  __testing_resetBodyScanCacheDevStatus,
  emitBodyScanCacheDevStatus,
  isBodyScanCacheDevToolsEnabled,
  sanitizeBodyScanCacheDevStatus,
  serializeBodyScanCacheDevStatus,
} from "../bodyScanCacheDevStatus";

describe("syntheticBodyScanCachePdf", () => {
  it("builds a deterministic valid PDF with only approved text", () => {
    const a = buildSyntheticBodyScanCachePdfBytes();
    const b = buildSyntheticBodyScanCachePdfBytes();
    expect(a.length).toBe(b.length);
    expect(a[0]).toBe("%".charCodeAt(0));
    const latin1 = String.fromCharCode(...a);
    expect(latin1.startsWith("%PDF")).toBe(true);
    expect(syntheticBodyScanCachePdfContainsOnlyApprovedText(latin1)).toBe(true);
    for (const line of SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES) {
      expect(latin1).toContain(line);
    }
    expect(latin1).not.toMatch(/\bDOB\b/);
    expect(latin1).not.toMatch(/\bPatient\b/i);
    expect(latin1).not.toContain("162.2");
    expect(latin1).not.toMatch(/Live Lean/i);
  });

  it("builds invalid bytes that are not PDFs", () => {
    const invalid = buildInvalidSyntheticBodyScanCacheBytes();
    const latin1 = String.fromCharCode(...invalid);
    expect(latin1.startsWith("%PDF")).toBe(false);
  });

  it("encodes base64 without throwing", () => {
    const b64 = uint8ToBase64(buildSyntheticBodyScanCachePdfBytes());
    expect(b64.length).toBeGreaterThan(20);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe("bodyScanCacheDevStatus redaction", () => {
  beforeEach(() => {
    __testing_resetBodyScanCacheDevStatus();
  });

  it("is gated to __DEV__", () => {
    expect(isBodyScanCacheDevToolsEnabled({ __DEV__: false })).toBe(false);
    expect(isBodyScanCacheDevToolsEnabled({ __DEV__: true })).toBe(true);
  });

  it("drops malicious identity fields from serialized status", () => {
    const safe = sanitizeBodyScanCacheDevStatus({
      operation: "preview_close_cleanup",
      status: "ok",
      remainingFileCountBucket: "zero",
      removedFileCountBucket: "one",
      partialFileCountBucket: "zero",
      uid: "uid_secret",
      documentId: "doc_secret",
      scanId: "scan_secret",
      filename: "report.pdf",
      localUri: "file:///cache/secret.pdf",
      signedUrl: "https://storage.example/signed",
      reportText: "Body Fat 20.9%",
      path: "/private/var/secret",
    });
    const json = serializeBodyScanCacheDevStatus(safe);
    expect(json).not.toContain("uid_secret");
    expect(json).not.toContain("doc_secret");
    expect(json).not.toContain("scan_secret");
    expect(json).not.toContain("report.pdf");
    expect(json).not.toContain("file://");
    expect(json).not.toContain("https://");
    expect(json).not.toContain("20.9");
    expect(json).toContain('"operation":"preview_close_cleanup"');
    expect(json).not.toContain(BODY_SCAN_CACHE_DEV_EVENT_PREFIX);
  });

  it("does not emit outside __DEV__", () => {
    const original = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      const emitted = emitBodyScanCacheDevStatus({
        operation: "stale_sweep",
        status: "ok",
        remainingFileCountBucket: "zero",
        removedFileCountBucket: "one",
        partialFileCountBucket: "zero",
      });
      expect(emitted).toBeNull();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = original;
    }
  });
});
