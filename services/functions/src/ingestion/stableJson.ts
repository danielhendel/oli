// services/functions/src/ingestion/stableJson.ts

/**
 * Deterministic JSON stringify with stable key ordering.
 * Purpose: hashing payloads for replay/duplicate detection.
 * Note: Zod payload schemas use .strip(), so payloads should already be plain data.
 */
export function stableStringify(value: unknown): string {
    return JSON.stringify(sortRecursively(value));
  }
  
  function sortRecursively(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(sortRecursively);
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = sortRecursively(obj[k]);
      return out;
    }
    return value;
  }