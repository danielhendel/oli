// services/functions/src/normalization/canonicalImmutability.ts

import crypto from "node:crypto";
import type { CanonicalEvent } from "../types/health";

/**
 * Stable stringify for deterministic hashing/comparison.
 * - Sorts object keys recursively
 * - Preserves array order
 */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;

  if (t === "string" || t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${parts.join(",")}}`;
  }

  // symbols/functions/undefined shouldn't appear in CanonicalEvent; stringify safely anyway
  return JSON.stringify(String(value));
}

export function canonicalHash(canonical: CanonicalEvent): string {
  const s = stableStringify(canonical);
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function canonicalEquals(a: CanonicalEvent, b: CanonicalEvent): boolean {
  // Fast path via stable stringify (deterministic)
  return stableStringify(a) === stableStringify(b);
}
