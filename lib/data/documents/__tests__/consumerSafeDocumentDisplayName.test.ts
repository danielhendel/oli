import { describe, expect, it } from "@jest/globals";
import {
  CONSUMER_SAFE_DOCUMENT_DISPLAY_NAME_VERSION,
  looksLikeOpaqueGeneratedFilename,
  resolveConsumerSafeDocumentDisplayName,
  truncateDocumentDisplayNameForList,
} from "../consumerSafeDocumentDisplayName";

describe("consumerSafeDocumentDisplayName", () => {
  it("exports version constant", () => {
    expect(CONSUMER_SAFE_DOCUMENT_DISPLAY_NAME_VERSION).toBe("1.1.0");
  });

  it("keeps normal user-visible filenames", () => {
    expect(resolveConsumerSafeDocumentDisplayName("DirectLabs.pdf", { domain: "labs" })).toBe("DirectLabs.pdf");
    expect(resolveConsumerSafeDocumentDisplayName("My Labs.pdf", { domain: "labs" })).toBe("My Labs.pdf");
    expect(resolveConsumerSafeDocumentDisplayName("Quest_Labs_2022.pdf", { domain: "labs" })).toBe(
      "Quest_Labs_2022.pdf",
    );
  });

  it("falls back for missing or empty names", () => {
    expect(resolveConsumerSafeDocumentDisplayName("", { domain: "labs" })).toBe("Lab report");
    expect(resolveConsumerSafeDocumentDisplayName("   ")).toBe("Document");
  });

  it("falls back for UUID-like, hex hash, and DocumentPicker opaque names", () => {
    expect(
      resolveConsumerSafeDocumentDisplayName("a1b2c3d4-e5f6-4789-a012-3456789abcde.pdf", { domain: "labs" }),
    ).toBe("Lab report");
    expect(
      resolveConsumerSafeDocumentDisplayName(`${"a".repeat(64)}.pdf`, { domain: "labs" }),
    ).toBe("Lab report");
    expect(
      resolveConsumerSafeDocumentDisplayName("DocumentPicker-12345.pdf", { domain: "labs" }),
    ).toBe("Lab report");
    expect(
      resolveConsumerSafeDocumentDisplayName("7f3c9a2b1e8d4f6a0c5b9d2e7f1a4c8b.pdf", { domain: "labs" }),
    ).toBe("Lab report");
  });

  it("falls back for multi-segment high-entropy storage keys", () => {
    expect(
      resolveConsumerSafeDocumentDisplayName("MRWGxLdl2Krp8DFtpjYy_d0y6W85Tkh2isXe.pdf", { domain: "labs" }),
    ).toBe("Lab report");
  });

  it("sanitizes path traversal and unsafe separators", () => {
    expect(resolveConsumerSafeDocumentDisplayName("../secret.pdf", { domain: "labs" })).toBe(".._secret.pdf");
    expect(resolveConsumerSafeDocumentDisplayName("folder/report.pdf", { domain: "labs" })).toBe("folder_report.pdf");
  });

  it("truncates long display names for list rows", () => {
    const long = `${"A".repeat(60)}.pdf`;
    const truncated = truncateDocumentDisplayNameForList(long, 48);
    expect(truncated.length).toBeLessThanOrEqual(48);
    expect(truncated.endsWith("…")).toBe(true);
  });

  it("detects opaque generated filenames", () => {
    expect(looksLikeOpaqueGeneratedFilename("DirectLabs.pdf")).toBe(false);
    expect(looksLikeOpaqueGeneratedFilename("Quest_Labs_2022.pdf")).toBe(false);
    expect(looksLikeOpaqueGeneratedFilename("DocumentPicker-abc.pdf")).toBe(true);
    expect(looksLikeOpaqueGeneratedFilename("MRWGxLdl2Krp8DFtpjYy_d0y6W85Tkh2isXe.pdf")).toBe(true);
    expect(looksLikeOpaqueGeneratedFilename(`${"a".repeat(64)}.pdf`)).toBe(true);
  });
});
