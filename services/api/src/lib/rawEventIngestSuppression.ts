/**
 * Apple Health v2 rows use deterministic Firestore doc ids under rawEvents.
 * Deletes that 404 (no doc yet) or 200 still record a tombstone so POST /ingest can block re-create.
 * List/single reads consult the same collection for defense-in-depth when any writer bypasses POST.
 */

const APPLE_HEALTH_V2_PREFIX = "appleHealth:v2:";

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
  return rawEventId.startsWith(`${APPLE_HEALTH_V2_PREFIX}workout:`);
}

/** Apple Health body weight rows (`appleHealth:v2:bodyWeight:*`). */
export function isAppleHealthBodyWeightIngestSuppressionDocId(rawEventId: string): boolean {
  return rawEventId.startsWith(`${APPLE_HEALTH_V2_PREFIX}bodyWeight:`);
}

/** Apple Health body composition rows (`appleHealth:v2:bodyComposition:*`). */
export function isAppleHealthBodyCompositionIngestSuppressionDocId(rawEventId: string): boolean {
  return rawEventId.startsWith(`${APPLE_HEALTH_V2_PREFIX}bodyComposition:`);
}

export function isAppleHealthBodyIngestSuppressionDocId(rawEventId: string): boolean {
  return (
    isAppleHealthBodyWeightIngestSuppressionDocId(rawEventId) ||
    isAppleHealthBodyCompositionIngestSuppressionDocId(rawEventId)
  );
}

/** Any raw event id that participates in `rawEventIngestSuppressions` tombstone contract. */
export function isRawEventIngestSuppressionDocId(rawEventId: string): boolean {
  return (
    isAppleHealthWorkoutIngestSuppressionDocId(rawEventId) ||
    isAppleHealthBodyIngestSuppressionDocId(rawEventId)
  );
}

/** Kinds blocked on POST /ingest when a tombstone exists for apple_health provider. */
export function isAppleHealthIngestSuppressionKind(kind: string): boolean {
  return (
    kind === "workout" ||
    kind === "strength_workout" ||
    kind === "weight" ||
    kind === "body_composition"
  );
}
