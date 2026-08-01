import { describe, expect, it } from "@jest/globals";
import type { DocumentRecordStatus } from "@/lib/contracts";
import { documentCanRetry, documentRetryLabel, documentStatusLabel } from "../documentStatus";

describe("documentCanRetry", () => {
  it("allows retry for failed (retryable) status", () => {
    expect(documentCanRetry("failed")).toBe(true);
  });

  it("allows reprocess for unsupported extraction when Labs parsers may upgrade", () => {
    expect(documentCanRetry("unsupported")).toBe(true);
    expect(documentRetryLabel("unsupported")).toBe("Reprocess report");
  });

  it("does not allow retry for non-retryable durable states", () => {
    const blocked: DocumentRecordStatus[] = [
      "uploading",
      "stored",
      "processing",
      "review_needed",
      "structured",
    ];
    for (const status of blocked) {
      expect(documentCanRetry(status)).toBe(false);
      expect(documentRetryLabel(status)).toBeNull();
    }
  });
});

describe("documentStatusLabel", () => {
  it("labels unsupported as extraction unavailable", () => {
    expect(documentStatusLabel("unsupported")).toBe("Extraction unavailable");
  });
});
