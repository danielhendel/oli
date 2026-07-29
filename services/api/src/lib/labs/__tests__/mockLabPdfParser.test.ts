import { describe, expect, it } from "@jest/globals";
import {
  LAB_STRUCTURED_EXTRACTION_UNAVAILABLE_MESSAGE,
  mockParseLabPdf,
  resolveLabPdfStructuredExtraction,
} from "../mockLabPdfParser";

describe("labs parser fail-closed safety", () => {
  it("does not create mock biomarkers for arbitrary PDFs", () => {
    const pdfBytes = Buffer.from("%PDF-1.4 fake arbitrary content LDL HDL HbA1c 999", "utf8");
    const outcome = mockParseLabPdf({
      uploadId: "up_test",
      fileName: "arbitrary.pdf",
      now: "2026-07-28T12:00:00.000Z",
      pdfBytes,
    });

    expect(outcome.status).toBe("unsupported");
    expect(outcome.results).toEqual([]);
    expect(outcome.matchedCount).toBe(0);
    expect(outcome.unmatchedCount).toBe(0);
    expect(outcome.userMessage).toBe(LAB_STRUCTURED_EXTRACTION_UNAVAILABLE_MESSAGE);
  });

  it("never marks parsed without real extraction", () => {
    const outcome = resolveLabPdfStructuredExtraction({
      uploadId: "up_2",
      fileName: "labs.pdf",
      now: "2026-07-28T12:00:00.000Z",
      pdfBytes: Buffer.from("anything"),
    });
    expect(outcome.status).not.toBe("parsed" as string);
    expect(JSON.stringify(outcome)).not.toMatch(/LDL|HDL|abnormal|flag/i);
  });

  it("exposes the user-facing unsupported message", () => {
    expect(LAB_STRUCTURED_EXTRACTION_UNAVAILABLE_MESSAGE).toContain(
      "structured extraction is not available yet",
    );
  });
});
