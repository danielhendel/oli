// lib/setup/prefill.ts
// Thin wrapper around the canonical logging prefill utils.
// Avoids DOM globals (btoa/atob) so it works in React Native/Hermes.

import { encodePrefill as _encode, decodePrefill as _decode } from "../logging/prefill";

export const encodePrefill = _encode;
export const decodePrefill = _decode;

/**
 * @deprecated Prefer `decodePrefill(s)` which returns a safe object ({} on bad input).
 * This shim mirrors the old signature and returns `undefined` when the decoded
 * payload is empty, so existing callers that expect `T | undefined` keep working.
 */
export function parsePrefill<T = Record<string, unknown>>(s: unknown): T | undefined {
  const str = typeof s === "string" ? s : undefined;
  const obj = _decode<unknown>(str);
  if (obj && typeof obj === "object" && Object.keys(obj as Record<string, unknown>).length > 0) {
    return obj as T;
  }
  return undefined;
}
