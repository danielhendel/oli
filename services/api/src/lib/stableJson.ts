/**
 * Deterministic JSON stringify with stable key ordering.
 * - Sorts object keys recursively
 * - Preserves array order
 * - Normalizes undefined -> null
 * - Normalizes Date / Firestore Timestamp-like -> ISO string
 */

function isTimestampLike(v: unknown): v is { toDate: () => Date } {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { toDate?: unknown }).toDate === "function"
  );
}

function normalizeScalar(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (isTimestampLike(value)) return value.toDate().toISOString();
  return value;
}

function sortRecursively(value: unknown): unknown {
  const normalized = normalizeScalar(value);

  if (Array.isArray(normalized)) {
    return normalized.map(sortRecursively);
  }

  if (normalized && typeof normalized === "object") {
    const obj = normalized as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = sortRecursively(obj[k]);
    return out;
  }

  return normalized;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}
