/**
 * Upload validation for Document Ingestion OS (pure).
 * Magic-byte checks and size/MIME/filename rules. No I/O.
 */

import type { DocumentDomain, DocumentMediaType, DocumentType } from "@oli/contracts";
import {
  documentTypeAllowedForDomain,
  DOCUMENT_UPLOAD_DEFERRED_DOMAINS,
  isDocumentUploadEnabledDomain,
} from "./documentTypes";

/**
 * Max original file size for Document OS v1 base64 JSON bridge (5 MiB).
 * Production target remains streaming/signed upload; do not raise without transport proof.
 */
export const DOCUMENT_MAX_BYTE_SIZE = 5 * 1024 * 1024;

/** Reject empty / trivially tiny payloads. */
export const DOCUMENT_MIN_BYTE_SIZE = 32;

export const DOCUMENT_ALLOWED_MEDIA_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
] as const satisfies readonly DocumentMediaType[];

export const DOCUMENT_MAX_FILENAME_LENGTH = 255;

export type DocumentValidationIssueCode =
  | "UNAUTHENTICATED"
  | "DOMAIN_NOT_ALLOWED"
  | "DOMAIN_DEFERRED"
  | "DOCUMENT_TYPE_NOT_ALLOWED"
  | "MEDIA_TYPE_NOT_ALLOWED"
  | "FILENAME_EMPTY"
  | "FILENAME_TOO_LONG"
  | "FILENAME_UNSAFE"
  | "FILE_TOO_SMALL"
  | "FILE_TOO_LARGE"
  | "CHECKSUM_INVALID"
  | "CHECKSUM_MISMATCH"
  | "MAGIC_BYTE_MISMATCH"
  | "PASSWORD_PROTECTED_PDF"
  | "MALFORMED_PDF"
  | "UNSUPPORTED_ARCHIVE"
  | "UNSUPPORTED_EXECUTABLE";

export type DocumentValidationIssue = {
  code: DocumentValidationIssueCode;
  message: string;
};

export type DocumentUploadValidationInput = {
  authenticated: boolean;
  domain: DocumentDomain;
  documentType?: DocumentType;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  bytes?: Uint8Array;
  declaredChecksumSha256?: string;
  computedChecksumSha256?: string;
};

export type DocumentUploadValidationResult =
  | { ok: true; mediaType: DocumentMediaType; safeDisplayFilename: string }
  | { ok: false; issues: DocumentValidationIssue[] };

const UNSAFE_FILENAME_PATTERN = /[\\/<>:"|?*\u0000-\u001f]|^\.|\.\.|[\u202e\u200b]/; // eslint-disable-line no-control-regex

function isAllowedMediaType(mediaType: string): mediaType is DocumentMediaType {
  return (DOCUMENT_ALLOWED_MEDIA_TYPES as readonly string[]).includes(mediaType);
}

export function sanitizeDocumentDisplayFilename(originalFilename: string): string {
  const trimmed = originalFilename.trim().replace(/[/\\]/g, "_");
  const withoutControl = trimmed.replace(/[\u0000-\u001f\u007f]/g, ""); // eslint-disable-line no-control-regex
  const collapsed = withoutControl.replace(/\s+/g, " ").slice(0, DOCUMENT_MAX_FILENAME_LENGTH);
  return collapsed.length > 0 ? collapsed : "document";
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

function detectMagicMediaType(bytes: Uint8Array): DocumentMediaType | "archive" | "executable" | null {
  // PDF: %PDF
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  // JPEG
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // PNG
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // HEIC/HEIF often start with ftyp....heic / heif / mif1
  if (bytes.length >= 12) {
    const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (brand === "heic" || brand === "heif" || brand === "mif1" || brand === "msf1") {
      return "image/heic";
    }
  }
  // ZIP / archives
  if (startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWithBytes(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return "archive";
  }
  // ELF / PE executables
  if (startsWithBytes(bytes, [0x7f, 0x45, 0x4c, 0x46]) || startsWithBytes(bytes, [0x4d, 0x5a])) {
    return "executable";
  }
  return null;
}

/** Detect PDF encryption dictionary heuristically (no full PDF parse). */
export function isLikelyPasswordProtectedPdf(bytes: Uint8Array): boolean {
  // Search a bounded prefix for /Encrypt
  const sampleLen = Math.min(bytes.length, 64 * 1024);
  const sample = Buffer.from(bytes.subarray(0, sampleLen)).toString("latin1");
  return sample.includes("/Encrypt");
}

export function validateDocumentUpload(input: DocumentUploadValidationInput): DocumentUploadValidationResult {
  const issues: DocumentValidationIssue[] = [];

  if (!input.authenticated) {
    issues.push({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }

  if (!isDocumentUploadEnabledDomain(input.domain)) {
    if ((DOCUMENT_UPLOAD_DEFERRED_DOMAINS as readonly string[]).includes(input.domain)) {
      issues.push({
        code: "DOMAIN_DEFERRED",
        message: "Document upload is not enabled for this domain yet",
      });
    } else {
      issues.push({ code: "DOMAIN_NOT_ALLOWED", message: "Domain is not allowed for upload" });
    }
  }

  const documentType = input.documentType ?? undefined;
  if (documentType && !documentTypeAllowedForDomain(input.domain, documentType)) {
    issues.push({
      code: "DOCUMENT_TYPE_NOT_ALLOWED",
      message: "Document type is not allowed for the selected domain",
    });
  }

  if (!input.originalFilename.trim()) {
    issues.push({ code: "FILENAME_EMPTY", message: "Filename is required" });
  } else if (input.originalFilename.length > DOCUMENT_MAX_FILENAME_LENGTH) {
    issues.push({ code: "FILENAME_TOO_LONG", message: "Filename is too long" });
  } else if (UNSAFE_FILENAME_PATTERN.test(input.originalFilename)) {
    issues.push({ code: "FILENAME_UNSAFE", message: "Filename contains unsafe characters" });
  }

  if (!isAllowedMediaType(input.mediaType)) {
    issues.push({ code: "MEDIA_TYPE_NOT_ALLOWED", message: "File type is not supported" });
  }

  if (input.byteSize < DOCUMENT_MIN_BYTE_SIZE) {
    issues.push({ code: "FILE_TOO_SMALL", message: "File is empty or too small" });
  }
  if (input.byteSize > DOCUMENT_MAX_BYTE_SIZE) {
    issues.push({ code: "FILE_TOO_LARGE", message: "File exceeds the maximum allowed size" });
  }

  if (input.declaredChecksumSha256 != null) {
    if (!/^[a-f0-9]{64}$/.test(input.declaredChecksumSha256)) {
      issues.push({ code: "CHECKSUM_INVALID", message: "Checksum format is invalid" });
    } else if (
      input.computedChecksumSha256 != null &&
      input.declaredChecksumSha256 !== input.computedChecksumSha256
    ) {
      issues.push({ code: "CHECKSUM_MISMATCH", message: "Checksum does not match file contents" });
    }
  }

  if (input.bytes) {
    const magic = detectMagicMediaType(input.bytes);
    if (magic === "archive") {
      issues.push({ code: "UNSUPPORTED_ARCHIVE", message: "Archive files are not supported" });
    } else if (magic === "executable") {
      issues.push({ code: "UNSUPPORTED_EXECUTABLE", message: "Executable files are not supported" });
    } else if (magic == null) {
      issues.push({ code: "MAGIC_BYTE_MISMATCH", message: "File contents do not match a supported type" });
    } else if (isAllowedMediaType(input.mediaType) && magic !== input.mediaType) {
      // HEIC brands can be heif/mif1; mediaType image/heic is acceptable for those.
      const heicFamily =
        input.mediaType === "image/heic" && magic === "image/heic";
      if (!heicFamily && magic !== input.mediaType) {
        issues.push({
          code: "MAGIC_BYTE_MISMATCH",
          message: "File extension/MIME does not match file contents",
        });
      }
    }

    if (input.mediaType === "application/pdf" || magic === "application/pdf") {
      if (magic !== "application/pdf") {
        issues.push({ code: "MALFORMED_PDF", message: "File is not a valid PDF" });
      } else if (isLikelyPasswordProtectedPdf(input.bytes)) {
        issues.push({
          code: "PASSWORD_PROTECTED_PDF",
          message: "Password-protected PDFs are not supported",
        });
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    mediaType: input.mediaType as DocumentMediaType,
    safeDisplayFilename: sanitizeDocumentDisplayFilename(input.originalFilename),
  };
}
