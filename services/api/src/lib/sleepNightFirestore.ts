/** Convert Firestore Timestamp-like fields to ISO strings for JSON + Zod parsing. */
function isFirestoreTimestampLike(v: unknown): v is { toDate: () => Date } {
  return (
    v != null &&
    typeof v === "object" &&
    typeof (v as { toDate?: unknown }).toDate === "function"
  );
}

export function firestoreDocToPlainJson(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isFirestoreTimestampLike(v)) {
      out[k] = v.toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}
