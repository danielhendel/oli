/**
 * DEV runtime diagnostics — safe stage emissions only.
 */

import { describe, expect, it } from "@jest/globals";

import {
  BODY_SCAN_RUNTIME_DEV_EVENT_PREFIX,
  BODY_SCAN_RUNTIME_JS_TOKEN,
  byteLengthToDevBucket,
  emitBodyScanRuntimeDevStatus,
  emitBodyScanRuntimeJsToken,
  httpStatusToDevBucket,
  serializeBodyScanRuntimeDevStatus,
} from "../bodyScanRuntimeDevStatus";

describe("bodyScanRuntimeDevStatus", () => {
  it("emits js token without identifiers or health values", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const status = emitBodyScanRuntimeJsToken();
    expect(status?.jsToken).toBe(BODY_SCAN_RUNTIME_JS_TOKEN);
    const json = serializeBodyScanRuntimeDevStatus(status!);
    expect(json).toContain(BODY_SCAN_RUNTIME_JS_TOKEN);
    expect(json).not.toMatch(/users\//i);
    expect(json).not.toMatch(/https?:\/\//i);
    expect(json).not.toContain("patient");
  });

  it("is a no-op outside __DEV__", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(
      emitBodyScanRuntimeDevStatus({
        operation: "reprocess",
        stage: "press",
        status: "started",
      }),
    ).toBeNull();
  });

  it("maps http and byte buckets safely", () => {
    expect(httpStatusToDevBucket(202)).toBe("2xx");
    expect(httpStatusToDevBucket(404)).toBe("4xx");
    expect(byteLengthToDevBucket(0)).toBe("zero");
    expect(byteLengthToDevBucket(2048)).toBe("normal");
    expect(byteLengthToDevBucket(6 * 1024 * 1024)).toBe("oversized");
  });

  it("keeps the event prefix stable for Metro grepping", () => {
    expect(BODY_SCAN_RUNTIME_DEV_EVENT_PREFIX).toBe("[BODY_SCAN_RUNTIME_DEV]");
  });
});
