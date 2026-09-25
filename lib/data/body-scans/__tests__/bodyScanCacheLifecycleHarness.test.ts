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
  Linking: {
    canOpenURL: jest.fn(async () => false),
    openURL: jest.fn(async () => undefined),
  },
}));

import {
  __testing_resetBodyScanCacheDevStatus,
  getLastBodyScanCacheDevStatus,
} from "../bodyScanCacheDevStatus";
import {
  harnessClearAllBodyScanCaches,
  harnessCreateInvalidSyntheticReport,
  harnessOpenSyntheticReport,
  harnessRunStaleSweep,
  harnessSimulatePostDeleteLocalCleanup,
} from "../bodyScanCacheLifecycleHarness";
import { isBodyScanCacheDevToolsEnabled } from "../bodyScanCacheDevStatus";

describe("bodyScanCacheLifecycleHarness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __testing_resetBodyScanCacheDevStatus();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    mockGetInfoAsync.mockResolvedValue({ exists: false, size: 0 });
    mockReadDirectoryAsync.mockResolvedValue([]);
    mockReadAsStringAsync.mockResolvedValue("%PDF-");
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
    // After cleanup inventory is empty.
    mockReadDirectoryAsync.mockResolvedValue([]);

    const status = await harnessOpenSyntheticReport({ userId: "uid_dev_a" });
    expect(mockWriteAsStringAsync).toHaveBeenCalled();
    expect(mockOpenBrowserAsync).toHaveBeenCalled();
    expect(status?.operation).toBe("preview_close_cleanup");
    expect(status?.status).toBe("ok");
    expect(status?.remainingFileCountBucket).toBe("zero");
    expect(getLastBodyScanCacheDevStatus()?.operation).toBe("preview_close_cleanup");
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

  it("stale sweep emits safe buckets", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true, size: 0, modificationTime: 1 });
    mockReadDirectoryAsync
      .mockResolvedValueOnce(["ascope"])
      .mockResolvedValueOnce(["doc1"])
      .mockResolvedValueOnce(["stale.pdf", "orphan.partial"])
      .mockResolvedValueOnce([])
      .mockResolvedValue([]); // inventory after
    const status = await harnessRunStaleSweep();
    expect(status?.operation).toBe("stale_sweep");
    expect(status?.status).toBe("ok");
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
