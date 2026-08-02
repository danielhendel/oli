/**
 * Invalidate Labs derived client views after reprocess/delete/publish.
 * Not a second store — a lightweight bus so screens refetch without app restart.
 */

export type LabsDerivedInvalidatePayload = {
  reason: "reprocess" | "delete" | "publish" | "manual";
  documentId?: string;
  at: string;
};

type Listener = (payload: LabsDerivedInvalidatePayload) => void;

const listeners = new Set<Listener>();

export function invalidateLabsDerivedViews(
  payload: Omit<LabsDerivedInvalidatePayload, "at"> & { at?: string },
): void {
  const full: LabsDerivedInvalidatePayload = {
    reason: payload.reason,
    ...(payload.documentId ? { documentId: payload.documentId } : {}),
    at: payload.at ?? new Date().toISOString(),
  };
  for (const l of listeners) l(full);
}

export function subscribeLabsDerivedInvalidate(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Test-only reset. */
export function __testing_resetLabsDerivedInvalidate(): void {
  listeners.clear();
}
