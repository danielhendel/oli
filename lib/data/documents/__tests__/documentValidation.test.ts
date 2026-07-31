import { describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_MAX_BYTE_SIZE,
  DOCUMENT_MIN_BYTE_SIZE,
  validateDocumentUpload,
  type DocumentUploadValidationInput,
} from "../documentValidation";

const VALID_CHECKSUM = "b".repeat(64);

function pdfBytes(extra = ""): Uint8Array {
  // Keep payloads above DOCUMENT_MIN_BYTE_SIZE (32).
  return Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}\n%%EOF\n`);
}

function jpegBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 40 }, () => 0)]);
}

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...Array.from({ length: 40 }, () => 0),
  ]);
}

type ValidationOverrides = {
  [K in keyof DocumentUploadValidationInput]?: Exclude<DocumentUploadValidationInput[K], undefined>;
};

function baseInput(overrides: ValidationOverrides = {}): DocumentUploadValidationInput {
  const bytes = pdfBytes();
  const base: DocumentUploadValidationInput = {
    authenticated: true,
    domain: "labs",
    documentType: "lab_report",
    originalFilename: "Report.pdf",
    mediaType: "application/pdf",
    byteSize: bytes.byteLength,
    bytes,
  };
  return { ...base, ...overrides };
}

function issueCodes(input: DocumentUploadValidationInput): string[] {
  const result = validateDocumentUpload(input);
  if (result.ok) return [];
  return result.issues.map((i) => i.code);
}

describe("validateDocumentUpload", () => {
  it("accepts allowed PDF, JPEG, and PNG uploads", () => {
    for (const [mediaType, filename, bytes] of [
      ["application/pdf", "Report.pdf", pdfBytes()] as const,
      ["image/jpeg", "photo.jpg", jpegBytes()] as const,
      ["image/png", "scan.png", pngBytes()] as const,
    ]) {
      const result = validateDocumentUpload(
        baseInput({
          mediaType,
          originalFilename: filename,
          bytes,
          byteSize: bytes.byteLength,
          domain: "labs",
          ...(mediaType === "application/pdf" ? { documentType: "lab_report" as const } : {}),
        }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.mediaType).toBe(mediaType);
    }
  });

  it("rejects invalid MIME types", () => {
    expect(issueCodes(baseInput({ mediaType: "application/zip", }))).toContain(
      "MEDIA_TYPE_NOT_ALLOWED",
    );
    expect(issueCodes(baseInput({ mediaType: "text/plain", }))).toContain(
      "MEDIA_TYPE_NOT_ALLOWED",
    );
  });

  it("rejects extension/MIME vs magic-byte mismatch", () => {
    const jpeg = jpegBytes();
    expect(
      issueCodes(
        baseInput({
          mediaType: "application/pdf",
          originalFilename: "Report.pdf",
          bytes: jpeg,
          byteSize: jpeg.byteLength,
        }),
      ),
    ).toEqual(expect.arrayContaining(["MAGIC_BYTE_MISMATCH", "MALFORMED_PDF"]));
  });

  it("rejects oversized files using DOCUMENT_MAX_BYTE_SIZE", () => {
    expect(DOCUMENT_MAX_BYTE_SIZE).toBe(5 * 1024 * 1024);
    expect(
      issueCodes(
        baseInput({
          byteSize: DOCUMENT_MAX_BYTE_SIZE + 1,
          
        }),
      ),
    ).toContain("FILE_TOO_LARGE");
  });

  it("rejects empty / too-small files", () => {
    expect(DOCUMENT_MIN_BYTE_SIZE).toBe(32);
    expect(issueCodes(baseInput({ byteSize: 0, }))).toContain("FILE_TOO_SMALL");
    expect(
      issueCodes(baseInput({ byteSize: DOCUMENT_MIN_BYTE_SIZE - 1, })),
    ).toContain("FILE_TOO_SMALL");
  });

  it("rejects password-protected PDFs that contain /Encrypt", () => {
    const encrypted = pdfBytes("/Encrypt << /Filter /Standard >>");
    expect(
      issueCodes(
        baseInput({
          bytes: encrypted,
          byteSize: encrypted.byteLength,
        }),
      ),
    ).toContain("PASSWORD_PROTECTED_PDF");
  });

  it("rejects unauthenticated uploads", () => {
    expect(issueCodes(baseInput({ authenticated: false, }))).toContain(
      "UNAUTHENTICATED",
    );
  });

  it("rejects deferred domains such as dna, scans, and medical_history", () => {
    expect(
      issueCodes(
        baseInput({
          domain: "dna",
          documentType: "dna_report",
        }),
      ),
    ).toContain("DOMAIN_DEFERRED");
    expect(
      issueCodes(
        baseInput({
          domain: "scans",
          documentType: "dexa_report",
        }),
      ),
    ).toContain("DOMAIN_DEFERRED");
    expect(
      issueCodes(
        baseInput({
          domain: "medical_history",
          documentType: "medical_record",
        }),
      ),
    ).toContain("DOMAIN_DEFERRED");
  });

  it("rejects unsafe filenames", () => {
    expect(issueCodes(baseInput({ originalFilename: "../secret.pdf", }))).toContain(
      "FILENAME_UNSAFE",
    );
    expect(issueCodes(baseInput({ originalFilename: "a\\b.pdf", }))).toContain(
      "FILENAME_UNSAFE",
    );
    expect(issueCodes(baseInput({ originalFilename: "", }))).toContain(
      "FILENAME_EMPTY",
    );
  });

  it("accepts matching checksums and rejects mismatches / invalid format", () => {
    expect(
      issueCodes(
        baseInput({
          declaredChecksumSha256: VALID_CHECKSUM,
          computedChecksumSha256: VALID_CHECKSUM,
          
        }),
      ),
    ).not.toContain("CHECKSUM_MISMATCH");
    expect(
      issueCodes(
        baseInput({
          declaredChecksumSha256: VALID_CHECKSUM,
          computedChecksumSha256: "c".repeat(64),
          
        }),
      ),
    ).toContain("CHECKSUM_MISMATCH");
    expect(
      issueCodes(
        baseInput({
          declaredChecksumSha256: "not-hex",
          
        }),
      ),
    ).toContain("CHECKSUM_INVALID");
  });

  it("rejects archives and executables by magic bytes", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...Array.from({ length: 40 }, () => 0)]);
    expect(
      issueCodes(
        baseInput({
          mediaType: "application/pdf",
          bytes: zip,
          byteSize: zip.byteLength,
        }),
      ),
    ).toContain("UNSUPPORTED_ARCHIVE");

    const pe = new Uint8Array([0x4d, 0x5a, ...Array.from({ length: 40 }, () => 0)]);
    expect(
      issueCodes(
        baseInput({
          mediaType: "application/pdf",
          bytes: pe,
          byteSize: pe.byteLength,
        }),
      ),
    ).toContain("UNSUPPORTED_EXECUTABLE");
  });
});
