/**
 * DEV harness action tests — mock FileSystem / preview; exercise real services.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockDeleteAsync = jest.fn(async () => undefined);
const mockMakeDirectoryAsync = jest.fn(async () => undefined);
const mockWriteAsStringAsync = jest.fn(async () => undefined);
const mockMoveAsync = jest.fn(async () => undefined);
const mockGetInfoAsync = jest.fn(async () => ({ exists: false, size: 0 }));
const mockReadDirectoryAsync = jest.fn(async () => [] as string[]);
const mockReadAsStringAsync = jest.fn(async () => "%PDF-");
const mockOpenBrowserAsync = jest.fn(async () => undefined);
const mockCanOpenURL = jest.fn(async () => false);
const mockOpenURL = jest.fn(async () => undefined);

jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { UTF8: "utf8", Base64: "base64" },
  deleteAsync: (...a: unknown[]) => mockDeleteAsync(...(a as [])),
  makeDirectoryAsync: (...a: unknown[]) => mockMakeDirectoryAsync(...(a as [])),
  writeAsStringAsync: (...a: unknown[]) => mockWriteAsStringAsync(...(a as [])),
  moveAsync: (...a: unknown[]) => mockMoveAsync(...(a as [])),
  getInfoAsync: (...a: unknown[]) => mockGetInfoAsync(...(a as [])),
  readDirectoryAsync: (...a: unknown[]) => mockReadDirectoryAsync(...(a as [])),
  readAsStringAsync: (...a: unknown[]) => mockReadAsStringAsync(...(a as [])),
  downloadAsync: jest.fn(),
}));

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
  __testing_resetBodyScanCacheDevStatus,
  getLastBodyScanCacheDevStatus,
  isBodyScanCacheDevToolsEnabled,
} from "../bodyScanCacheDevStatus";
import {
  harnessClearAllBodyScanCaches,
  harnessCreateAbandonedPartial,
  harnessCreateInvalidSyntheticReport,
  harnessCreateStaleSyntheticPdf,
  harnessInspectBodyScanTestCache,
  harnessOpenSyntheticReport,
  harnessRunStaleSweep,
  harnessSimulatePostDeleteLocalCleanup,
} from "../bodyScanCacheLifecycleHarness";
import { openBodyScanOriginalLocalPreview } from "../openBodyScanOriginalLocalPreview";

describe("bodyScanCacheLifecycleHarness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __testing_resetBodyScanCacheDevStatus();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    mockGetInfoAsync.mockResolvedValue({ exists: false, size: 0 });
    mockReadDirectoryAsync.mockResolvedValue([]);
    mockReadAsStringAsync.mockResolvedValue("%PDF-");
    mockOpenBrowserAsync.mockResolvedValue(undefined);
    mockCanOpenURL.mockResolvedValue(false);
  });

  it("requires DEV tools", () => {
    expect(isBodyScanCacheDevToolsEnabled({ __DEV__: true })).toBe(true);
  });

  it("open synthetic report uses WebBrowser and emits close cleanup when file is gone", async () => {
    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      if (String(uri).endsWith(".partial") || String(uri).endsWith(".pdf")) {
        return { exists: true, size: 64, modificationTime: Date.now() / 1000 };
      }
      if (String(uri).includes("body-scans")) {
        return { exists: true, isDirectory: true };
      }
      return { exists: false, size: 0 };
    });
    mockReadDirectoryAsync.mockResolvedValue([]);

    const status = await harnessOpenSyntheticReport({ userId: "uid_dev_a" });
    expect(mockWriteAsStringAsync).toHaveBeenCalled();
    expect(mockOpenBrowserAsync).toHaveBeenCalled();
    expect(status?.operation).toBe("preview_close_cleanup");
    expect(status?.status).toBe("ok");
    expect(status?.remainingFileCountBucket).toBe("zero");
    expect(status?.previewMethod).toBe("web_browser");
    expect(getLastBodyScanCacheDevStatus()?.operation).toBe("preview_close_cleanup");
  });

  it("maps iOS local-file open failure to preview_method_unsupported", async () => {
    mockOpenBrowserAsync.mockRejectedValue(new Error("unsupported"));
    mockCanOpenURL.mockResolvedValue(false);
    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      if (String(uri).endsWith(".partial") || String(uri).endsWith(".pdf")) {
        return { exists: true, size: 64, modificationTime: Date.now() / 1000 };
      }
      if (String(uri).includes("body-scans")) {
        return { exists: true, isDirectory: true };
      }
      return { exists: false, size: 0 };
    });
    mockReadDirectoryAsync.mockResolvedValue([]);

    const status = await harnessOpenSyntheticReport({ userId: "uid_dev_a" });
    expect(status?.operation).toBe("preview_failure_cleanup");
    expect(status?.safeReasonCode).toBe("preview_method_unsupported");
    expect(status?.remainingFileCountBucket).toBe("zero");
  });

  it("Linking fallback reports launch-only deferred cleanup", async () => {
    mockOpenBrowserAsync.mockRejectedValue(new Error("unsupported"));
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined);

    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      if (String(uri).endsWith(".partial") || String(uri).endsWith(".pdf")) {
        return { exists: true, size: 64, modificationTime: Date.now() / 1000 };
      }
      if (String(uri).includes("body-scans")) {
        return { exists: true, isDirectory: true };
      }
      return { exists: false, size: 0 };
    });
    mockReadDirectoryAsync.mockResolvedValue([]);

    const status = await harnessOpenSyntheticReport({ userId: "uid_dev_a" });
    expect(mockOpenURL).toHaveBeenCalled();
    expect(status?.operation).toBe("preview_open");
    expect(status?.safeReasonCode).toBe("fallback_requires_stale_cleanup");
    expect(status?.previewMethod).toBe("linking");
  });

  it("invalid synthetic report emits failure cleanup with zero remaining", async () => {
    mockReadAsStringAsync.mockResolvedValue("NOTPDF");
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 10, modificationTime: Date.now() / 1000 });
    mockReadDirectoryAsync.mockResolvedValue([]);
    const status = await harnessCreateInvalidSyntheticReport({ userId: "uid_dev_a" });
    expect(status?.operation).toBe("preview_failure_cleanup");
    expect(status?.safeReasonCode).toBe("invalid_pdf_rejected");
    expect(status?.remainingFileCountBucket).toBe("zero");
    expect(status?.partialFileCountBucket).toBe("zero");
  });

  it("stale PDF fixture create verifies existence before ok", async () => {
    const scope = "a6e329855074312cb";
    let created = false;

    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      const u = String(uri);
      if (u.endsWith(".pdf") || u.endsWith(".partial")) {
        return { exists: true, size: 64, modificationTime: Date.now() / 1000 };
      }
      return { exists: true, isDirectory: true, size: 0 };
    });
    mockReadDirectoryAsync.mockImplementation(async (uri: string) => {
      if (!created) return [];
      const u = String(uri);
      if (u === "file:///cache/body-scans/") return [scope];
      if (u === `file:///cache/body-scans/${scope}/`) return ["synth_cache_harness_stale"];
      if (u.includes("synth_cache_harness_stale")) return ["pstale.pdf"];
      return [];
    });
    mockWriteAsStringAsync.mockImplementation(async () => {
      created = true;
    });
    mockMoveAsync.mockImplementation(async () => undefined);

    const status = await harnessCreateStaleSyntheticPdf({ userId: "uid_dev_a" });
    expect(status?.operation).toBe("fixture_create");
    expect(status?.status).toBe("ok");
    expect(status?.remainingFileCountBucket).toBe("one");
    expect(status?.partialFileCountBucket).toBe("zero");
  });

  it("abandoned partial fixture create verifies existence", async () => {
    const scope = "a6e329855074312cb";
    let created = false;
    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      if (String(uri).endsWith(".partial")) {
        return { exists: created, size: 9, modificationTime: Date.now() / 1000 };
      }
      return { exists: true, isDirectory: true, size: 0 };
    });
    mockReadDirectoryAsync.mockImplementation(async (uri: string) => {
      if (!created) return [];
      const u = String(uri);
      if (u === "file:///cache/body-scans/") return [scope];
      if (u === `file:///cache/body-scans/${scope}/`) return ["synth_cache_harness_partial"];
      if (u.includes("synth_cache_harness_partial")) return ["ppart.partial"];
      return [];
    });
    mockWriteAsStringAsync.mockImplementation(async () => {
      created = true;
    });

    const status = await harnessCreateAbandonedPartial({ userId: "uid_dev_a" });
    expect(status?.operation).toBe("fixture_create");
    expect(status?.status).toBe("ok");
    expect(status?.partialFileCountBucket).toBe("one");
    expect(mockWriteAsStringAsync).toHaveBeenCalled();
  });

  it("inspect reports buckets only", async () => {
    const scope = "a6e329855074312cb";
    mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true, size: 0 });
    mockReadDirectoryAsync.mockImplementation(async (uri: string) => {
      const u = String(uri);
      if (u === "file:///cache/body-scans/") return [scope];
      if (u === `file:///cache/body-scans/${scope}/`) return ["doc1"];
      if (u.includes("doc1")) return ["a.pdf", "b.partial"];
      return [];
    });
    const status = await harnessInspectBodyScanTestCache({ userId: "uid_dev_a" });
    expect(status?.operation).toBe("cache_inspect");
    expect(status?.remainingFileCountBucket).toBe("two_to_five");
    expect(status?.partialFileCountBucket).toBe("one");
    const json = JSON.stringify(status);
    expect(json).not.toContain("file://");
    expect(json).not.toContain("uid_dev_a");
  });

  it("stale sweep with injected clock removes fixtures and reports nonzero removed", async () => {
    const present = new Set(["stale.pdf", "orphan.partial"]);
    mockGetInfoAsync.mockImplementation(async (uri: string) => {
      if (String(uri).endsWith(".pdf") || String(uri).endsWith(".partial")) {
        const name = String(uri).split("/").pop() ?? "";
        return {
          exists: present.has(name),
          size: 10,
          modificationTime: Date.now() / 1000,
        };
      }
      return { exists: true, isDirectory: true, size: 0, modificationTime: 1 };
    });

    mockReadDirectoryAsync.mockImplementation(async (uri: string) => {
      const u = String(uri);
      if (u === "file:///cache/body-scans/") return present.size > 0 ? ["ascope"] : [];
      if (u.endsWith("ascope/")) return present.size > 0 ? ["doc1"] : [];
      if (u.includes("doc1")) return [...present];
      return [];
    });
    mockDeleteAsync.mockImplementation(async (uri: string) => {
      const name = String(uri).split("/").pop() ?? "";
      present.delete(name);
    });

    const status = await harnessRunStaleSweep();
    expect(status?.operation).toBe("stale_sweep");
    expect(status?.status).toBe("ok");
    expect(status?.removedFileCountBucket).toBe("two_to_five");
    expect(status?.remainingFileCountBucket).toBe("zero");
    expect(status?.partialFileCountBucket).toBe("zero");
    expect(mockDeleteAsync.mock.calls.some((c) => String(c[0]).endsWith("stale.pdf"))).toBe(true);
    expect(mockDeleteAsync.mock.calls.some((c) => String(c[0]).endsWith("orphan.partial"))).toBe(true);
  });

  it("stale sweep fails when no fixtures exist", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false, size: 0 });
    mockReadDirectoryAsync.mockResolvedValue([]);
    const status = await harnessRunStaleSweep();
    expect(status?.status).toBe("failed");
    expect(status?.safeReasonCode).toBe("fixture_missing_before_sweep");
    expect(status?.removedFileCountBucket).toBe("zero");
  });

  it("document cleanup invokes real clear and reports", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1 });
    mockReadDirectoryAsync.mockResolvedValue([]);
    const status = await harnessSimulatePostDeleteLocalCleanup({ userId: "uid_dev_a" });
    expect(status?.operation).toBe("document_cleanup");
    expect(mockDeleteAsync).toHaveBeenCalled();
  });

  it("clear all only targets the dedicated root", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1 });
    mockReadDirectoryAsync.mockResolvedValue([]);
    const status = await harnessClearAllBodyScanCaches();
    expect(status?.operation).toBe("account_cleanup");
    const deleted = mockDeleteAsync.mock.calls.map((c) => String(c[0]));
    expect(deleted.some((u) => u.includes("body-scans"))).toBe(true);
    expect(deleted.every((u) => u.includes("body-scans") || u.endsWith("/"))).toBe(true);
  });
});

describe("openBodyScanOriginalLocalPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenBrowserAsync.mockResolvedValue(undefined);
    mockCanOpenURL.mockResolvedValue(false);
  });

  it("returns web_browser dismissed on success", async () => {
    const result = await openBodyScanOriginalLocalPreview("file:///cache/body-scans/a/d/p.pdf");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.method).toBe("web_browser");
      expect(result.settlement).toBe("dismissed");
      expect(result.deleteImmediately).toBe(true);
    }
  });

  it("never includes uri in failure payload", async () => {
    mockOpenBrowserAsync.mockRejectedValue(new Error("file:///secret.pdf boom"));
    mockCanOpenURL.mockResolvedValue(false);
    const result = await openBodyScanOriginalLocalPreview("file:///cache/secret.pdf");
    expect(result.ok).toBe(false);
    const json = JSON.stringify(result);
    expect(json).not.toContain("file://");
    expect(json).not.toContain("secret");
    if (!result.ok) {
      expect(result.safeReasonCode).toBe("preview_method_unsupported");
    }
  });
});
