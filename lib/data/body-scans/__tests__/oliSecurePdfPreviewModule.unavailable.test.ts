/**
 * Wrapper behavior when the native module is absent from the binary.
 */

import { describe, expect, it, jest } from "@jest/globals";

jest.mock("expo", () => ({
  requireOptionalNativeModule: () => null,
}));

import {
  isOliSecurePdfPreviewAvailable,
  presentSecurePdfPreview,
} from "oli-secure-pdf-preview";

describe("oli-secure-pdf-preview wrapper (native absent)", () => {
  it("returns native_preview_unavailable when module is missing", async () => {
    expect(isOliSecurePdfPreviewAvailable()).toBe(false);
    const result = await presentSecurePdfPreview({
      localUri: "file:///cache/body-scans/a/d/p.pdf",
    });
    expect(result).toEqual({
      ok: false,
      safeReasonCode: "native_preview_unavailable",
    });
  });
});
