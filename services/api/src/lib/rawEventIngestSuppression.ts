/**
 * Apple Health workout rows use deterministic Firestore doc ids under rawEvents.
 * Deletes that 404 (no doc yet) or 200 still record a tombstone so POST /ingest can block re-create.
 * List/single reads consult the same collection for defense-in depth when any writer bypasses POST.
 */

/**
 * Comma-separated Firestore raw event ids (exact match) for verbose suppression audit logs.
 * Example: RAW_EVENT_SUPPRESSION_AUDIT_IDS="appleHealth:v2:workout:2026-04-18T08:09:59.736-0400_..."
 * Remove after incident; logs include uid + requestId + rawEventId.
 */
export function suppressionAuditIdSet(): Set<string> {
  const raw = process.env.RAW_EVENT_SUPPRESSION_AUDIT_IDS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

export function shouldLogSuppressionAuditForId(id: string): boolean {
  return suppressionAuditIdSet().has(id);
}

/** Firestore doc id / Idempotency-Key for Apple Health workout rows (client + server aligned). */
export function isAppleHealthWorkoutIngestSuppressionDocId(rawEventId: string): boolean {
  return rawEventId.startsWith("appleHealth:v2:workout:");
}
