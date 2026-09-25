/**
 * Parser-level coverage for the DXA adapter: envelope + Body Scan draft, and registry
 * selection. The PDF text layer is stubbed so these tests exercise the adapter rather
 * than pdfjs (which has its own runtime suite).
 */

import {
  syntheticDxaAdapterInput,
  syntheticImageOnlyScanInput,
  SYNTHETIC_DXA_EXPECTATIONS,
} from "../../../../../../lib/data/body-scans/__fixtures__/liveLeanRxDxaSynthetic";

const textLayer = {
  pages: [] as { pageNumber: number; text: string }[],
  warningCodes: [] as string[],
};

jest.mock("../../labs/pdfTextExtraction", () => ({
  extractPdfTextPages: jest.fn(async () => ({
    pages: textLayer.pages,
    pageCount: textLayer.pages.length,
    textCharCount: textLayer.pages.reduce((sum, p) => sum + p.text.length, 0),
    warningCodes: textLayer.warningCodes,
    parser: { id: "pdfjs_text_v1", version: "test" },
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { liveLeanRxDxaParser, parseLiveLeanRxDxaBundle } = require("../liveLeanRxDxaParser");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveDocumentParserForInput } = require("../../documents/documentParsers");

function parserInput(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "doc_scan_1",
    domain: "scans" as const,
    documentType: "dexa_report" as const,
    mediaType: "application/pdf" as const,
    byteSize: 4096,
    checksumSha256: "c".repeat(64),
    storageObjectId: "users/u1/documents/doc_scan_1/original",
    safeDisplayFilename: "scan.pdf",
    fileBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    ...overrides,
  };
}

function useDxaTextLayer() {
  textLayer.pages = [...syntheticDxaAdapterInput().pages];
  textLayer.warningCodes = [];
}

function useImageOnlyTextLayer() {
  const input = syntheticImageOnlyScanInput();
  textLayer.pages = [...input.pages];
  textLayer.warningCodes = [...input.textWarningCodes];
}

describe("liveLeanRxDxaParser", () => {
  beforeEach(useDxaTextLayer);

  it("is selected ahead of the unsupported scan stub for a DXA report", async () => {
    const parser = await resolveDocumentParserForInput({
      documentType: "dexa_report",
      input: parserInput(),
    });
    expect(parser.id).toBe("live_lean_rx_dxa");
  });

  it("cascades to the unsupported scan stub when the PDF has no text layer", async () => {
    useImageOnlyTextLayer();
    const parser = await resolveDocumentParserForInput({
      documentType: "dexa_report",
      input: parserInput(),
    });
    expect(parser.id).toBe("unsupported_dexa");

    const extraction = await parser.parse(parserInput());
    expect(extraction.status).toBe("unsupported");
    expect(extraction.fields).toEqual([]);
  });

  it("produces an extraction envelope and a Body Scan draft in one pass", async () => {
    const { envelope, draft } = await parseLiveLeanRxDxaBundle(parserInput());

    expect(envelope.parserId).toBe("live_lean_rx_dxa");
    expect(envelope.documentId).toBe("doc_scan_1");
    expect(envelope.sourceDocumentChecksum).toBe("c".repeat(64));
    expect(envelope.fields.length).toBeGreaterThan(0);
    expect(envelope.provenance).toHaveLength(envelope.fields.length);

    expect(draft.scanId).toBe("doc_scan_1");
    expect(draft.documentId).toBe("doc_scan_1");
    expect(draft.scanTypeCandidate).toBe("dxa");
    expect(draft.performedAtCandidate).toBe(SYNTHETIC_DXA_EXPECTATIONS.performedAt);
    expect(draft.device).toEqual({ manufacturer: "GE Lunar", model: "iDXA" });
    expect(draft.superseded).toBe(false);
  });

  it("marks the envelope as needing review so nothing is auto-confirmed", async () => {
    const { envelope, draft } = await parseLiveLeanRxDxaBundle(parserInput());
    expect(envelope.reviewStatus).toBe("review_needed");
    expect(envelope.status).not.toBe("extracted_complete");
    expect(draft.status).not.toBe("confirmed");
  });

  it("keeps the source checksum and never carries raw page text into the draft", async () => {
    const { draft } = await parseLiveLeanRxDxaBundle(parserInput());
    const serialized = JSON.stringify(draft);
    expect(serialized).not.toContain("Body Composition Report");
    expect(serialized).not.toContain("GE Healthcare Lunar iDXA");
  });

  it("declines non-PDF media outright", async () => {
    const eligibility = await liveLeanRxDxaParser.canParse(
      parserInput({ mediaType: "image/jpeg" }),
    );
    expect(eligibility).toEqual({ eligible: false, reasonCode: "media_type_not_supported" });
  });

  it("stores the original and reports unsupported when source bytes are unavailable", async () => {
    const extraction = await liveLeanRxDxaParser.parse(parserInput({ fileBytes: undefined }));
    expect(extraction.status).toBe("unsupported");
    expect(extraction.warnings[0]?.code).toBe("DEXA_SOURCE_BYTES_UNAVAILABLE");
  });
});
