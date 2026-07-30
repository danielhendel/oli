/**
 * Cross-screen document list/detail consistency after durable mutations (delete).
 * Not a second document store — a lightweight invalidate + tombstone bus.
 */

export type DocumentDeletedPayload = {
  documentId: string;
};

type Listener = (payload: DocumentDeletedPayload) => void;

const listeners = new Set<Listener>();
/** In-session deleted ids so stale list responses cannot reinsert rows. */
const deletedIds = new Set<string>();
/** Cleared detail ids (tombstones for in-flight detail). */
const clearedDetailIds = new Set<string>();

export function markDocumentDeleted(documentId: string): void {
  if (!documentId) return;
  deletedIds.add(documentId);
  clearedDetailIds.add(documentId);
  const payload = { documentId };
  for (const l of listeners) {
    l(payload);
  }
}

export function isDocumentDeletedLocally(documentId: string): boolean {
  return deletedIds.has(documentId);
}

export function isDocumentDetailCleared(documentId: string): boolean {
  return clearedDetailIds.has(documentId);
}

export function filterOutDeletedDocuments<T extends { id: string }>(items: readonly T[]): T[] {
  if (deletedIds.size === 0) return [...items];
  return items.filter((item) => !deletedIds.has(item.id));
}

export function subscribeDocumentDeleted(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Test-only reset. */
export function __testing_resetDocumentListInvalidate(): void {
  listeners.clear();
  deletedIds.clear();
  clearedDetailIds.clear();
}
