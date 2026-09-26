/**
 * Non-iOS Body Scan preview remains unsupported in Stage 3E V1.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPresentSecurePdfPreview = jest.fn();
const mockIsAvailable = jest.fn(() => false);
const mockOpenBrowserAsync = jest.fn(async () => undefined);
const mockOpenURL = jest.fn(async () => undefined);

jest.mock("oli-secure-pdf-preview", () => ({
  isOliSecurePdfPreviewAvailable: () => mockIsAvailable(),
  presentSecurePdfPreview: (...a: unknown[]) => mockPresentSecurePdfPreview(...(a as [])),
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (...a: unknown[]) => mockOpenBrowserAsync(...(a as [])),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Linking: {
    canOpenURL: jest.fn(async () => true),
    openURL: (...a: unknown[]) => mockOpenURL(...(a as [])),
  },
}));

import { openBodyScanOriginalLocalPreview } from "../openBodyScanOriginalLocalPreview";

describe("openBodyScanOriginalLocalPreview (non-iOS)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns preview_method_unsupported without WebBrowser/Linking/native", async () => {
    const result = await openBodyScanOriginalLocalPreview(
      "file:///data/cache/body-scans/a/d/p.pdf",
    );
    expect(result).toEqual({
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: "preview_method_unsupported",
    });
    expect(mockPresentSecurePdfPreview).not.toHaveBeenCalled();
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});
