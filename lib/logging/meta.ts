import type { EventMeta, EventSource } from "./schemas";

/**
 * Return a fully-typed meta object without forcing createdAt/editedAt,
 * which are set by Firestore server timestamps in the write call.
 */
export function withCreateMeta(
  source: EventSource,
  partial: Partial<EventMeta> = {}
): EventMeta {
  const meta: EventMeta = {
    source,
    version: 1,
  };
  if (typeof partial.draft === "boolean") meta.draft = partial.draft;
  if (partial.idempotencyKey) meta.idempotencyKey = partial.idempotencyKey;
  // If caller provides createdAt/editedAt (already Timestamp), include them:
  if (partial.createdAt) meta.createdAt = partial.createdAt;
  if (partial.editedAt) meta.editedAt = partial.editedAt;
  return meta;
}

export function withEditMeta(prev: EventMeta): EventMeta {
  // Caller should set editedAt via serverTimestamp() in the write expression.
  return { ...prev };
}
