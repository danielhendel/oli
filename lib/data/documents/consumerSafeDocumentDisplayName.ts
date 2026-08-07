/**
 * Consumer-safe document display names — never surface opaque storage keys as primary labels.
 */

import type { DocumentDomain } from "@oli/contracts";

/** Keep in sync with DOCUMENT_MAX_FILENAME_LENGTH in documentValidation.ts (avoid circular import). */
const MAX_DISPLAY_FILENAME_LENGTH = 255;

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_HASH_LIKE = /^[0-9a-f]{32,64}$/i;
const DOCUMENT_PICKER_PREFIX = /^DocumentPicker-/i;
const OPAQUE_STORAGE_KEY =
  /^[A-Za-z0-9_-]{20,}\.(pdf|jpg|jpeg|png|heic)$/i;

function stripExtension(filename: string): { base: string; ext: string } {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return { base: filename, ext: "" };
  return { base: filename.slice(0, lastDot), ext: filename.slice(lastDot) };
}

function looksLikeOpaqueGeneratedFilename(filename: string): boolean {
  const trimmed = filename.trim();
  if (!trimmed) return true;
  const { base } = stripExtension(trimmed);
  if (UUID_LIKE.test(base)) return true;
  if (HEX_HASH_LIKE.test(base)) return true;
  if (DOCUMENT_PICKER_PREFIX.test(trimmed)) return true;
  if (OPAQUE_STORAGE_KEY.test(trimmed) && !/\s/.test(base)) return true;
  return false;
}

function fallbackDisplayName(domain?: DocumentDomain): string {
  if (domain === "labs") return "Lab report";
  return "Document";
}

function sanitizeBasics(originalFilename: string): string {
  const trimmed = originalFilename.trim().replace(/[/\\]/g, "_");
  const withoutControl = trimmed.replace(/[\u0000-\u001f\u007f]/g, ""); // eslint-disable-line no-control-regex
  return withoutControl.replace(/\s+/g, " ").slice(0, MAX_DISPLAY_FILENAME_LENGTH);
}

export type ConsumerSafeDisplayNameOptions = {
  domain?: DocumentDomain;
};

/**
 * Resolve a human-friendly display filename for lists and detail views.
 * Opaque generated IDs fall back to domain-appropriate labels.
 */
export function resolveConsumerSafeDocumentDisplayName(
  originalFilename: string,
  options: ConsumerSafeDisplayNameOptions = {},
): string {
  const sanitized = sanitizeBasics(originalFilename);
  if (!sanitized) {
    return options.domain === "labs" ? "Lab report" : "Document";
  }
  if (looksLikeOpaqueGeneratedFilename(sanitized)) {
    return fallbackDisplayName(options.domain);
  }
  return sanitized;
}

/** Truncate long display names for compact mobile list rows. */
export function truncateDocumentDisplayNameForList(
  displayName: string,
  maxVisible = 48,
): string {
  const trimmed = displayName.trim();
  if (trimmed.length <= maxVisible) return trimmed;
  if (maxVisible <= 1) return "…";
  return `${trimmed.slice(0, maxVisible - 1).trimEnd()}…`;
}

export { looksLikeOpaqueGeneratedFilename };
