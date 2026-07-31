import { describe, expect, it } from "@jest/globals";
import type { DocumentRecordStatus } from "@/lib/contracts";
import { documentCanRetry, documentStatusLabel } from "../documentStatus";

describe("documentCanRetry", () => {
  it("allows retry only for failed (retryable) status", () => {
    expect(documentCanRetry("failed")).toBe(true);
  });

  it("does not allow retry for unsupported extraction", () => {
    expect(documentCanRetry("unsupported")).toBe(false);
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
    }
  });
});

describe("documentStatusLabel", () => {
  it("labels unsupported as extraction unavailable", () => {
    expect(documentStatusLabel("unsupported")).toBe("Extraction unavailable");
  });
});
