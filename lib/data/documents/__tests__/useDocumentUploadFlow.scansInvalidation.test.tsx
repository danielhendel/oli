/**
 * Upload success for domain=scans publishes unified category invalidation.
 */
import {
  __testing_resetBodyScanListInvalidate,
  subscribeBodyScanListInvalidation,
  type BodyScanListInvalidation,
} from "@/lib/data/body-scans/bodyScanListInvalidate";

const mockCreateIntent = jest.fn();
const mockComplete = jest.fn();
const mockGetDetail = jest.fn();
const mockPick = jest.fn();
const mockReadBase64 = jest.fn();
const mockGetIdToken = jest.fn(async () => "token");
const mockAuth = {
  user: { uid: "user_a" },
  initializing: false as const,
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
};

jest.mock("@/lib/api/documents", () => ({
  createDocumentUploadIntent: (...args: unknown[]) => mockCreateIntent(...args),
  completeDocumentUpload: (...args: unknown[]) => mockComplete(...args),
  getDocumentDetail: (...args: unknown[]) => mockGetDetail(...args),
}));

jest.mock("@/lib/labs/expoDocumentPicker", () => ({
  DOCUMENT_PICKER_UNAVAILABLE_MESSAGE: "unavailable",
  pickLabPdfDocument: (...args: unknown[]) => mockPick(...args),
}));

jest.mock("@/lib/labs/readLabPdfBase64", () => ({
  readLocalUriAsBase64: (...args: unknown[]) => mockReadBase64(...args),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { useDocumentUploadFlow } from "@/lib/data/documents/useDocumentUploadFlow";

describe("scans upload invalidation", () => {
  beforeEach(() => {
    __testing_resetBodyScanListInvalidate();
    mockCreateIntent.mockReset();
    mockComplete.mockReset();
    mockGetDetail.mockReset();
    mockPick.mockReset();
    mockReadBase64.mockReset();
  });

  it("publishes upload_success all-categories after terminal scan upload", async () => {
    const events: BodyScanListInvalidation[] = [];
    subscribeBodyScanListInvalidation((e) => events.push(e));

    mockPick.mockResolvedValue({
      status: "selected",
      asset: { uri: "file://scan.pdf", name: "scan.pdf", mimeType: "application/pdf", size: 1200 },
    });
    mockReadBase64.mockResolvedValue("cGRm");
    mockCreateIntent.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: { documentId: "doc_1", uploadUrl: null },
    });
    mockComplete.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: {
        documentId: "doc_1",
        status: "review_needed",
        duplicate: false,
      },
    });
    mockGetDetail.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: { document: { status: "review_needed" } },
    });

    let flow!: ReturnType<typeof useDocumentUploadFlow>;
    function Harness() {
      flow = useDocumentUploadFlow({ domain: "scans", preferredScanType: "inbody" });
      return null;
    }
    await act(async () => {
      renderer.create(React.createElement(Harness));
    });
    await act(async () => {
      await flow.startUpload();
    });
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(flow.phase).toBe("success");
    expect(events).toEqual([{ reason: "upload_success", categories: "all" }]);
  });

  it("does not publish on cancelled picker", async () => {
    const events: BodyScanListInvalidation[] = [];
    subscribeBodyScanListInvalidation((e) => events.push(e));
    mockPick.mockResolvedValue({ status: "canceled" });

    let flow!: ReturnType<typeof useDocumentUploadFlow>;
    function Harness() {
      flow = useDocumentUploadFlow({ domain: "scans" });
      return null;
    }
    await act(async () => {
      renderer.create(React.createElement(Harness));
    });
    await act(async () => {
      await flow.startUpload();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(events).toHaveLength(0);
  });
});
