// lib/data/body-scans/useBodyScanActions.ts
import { useCallback, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { confirmBodyScan, deleteBodyScan, reprocessBodyScan } from "@/lib/api/bodyScans";
import type { BodyScanConfirmRequestDto } from "@/lib/contracts";
import { clearBodyScanOriginalCacheForDocument } from "@/lib/data/body-scans/bodyScanOriginalCache";
import { markDocumentDeleted } from "@/lib/data/documents/documentListInvalidate";

export type BodyScanActionKind = "confirm" | "reprocess" | "delete";

export type BodyScanActionOutcome =
  | { ok: true; kind: BodyScanActionKind }
  | { ok: false; kind: BodyScanActionKind; message: string };

type ActionState = { pending: BodyScanActionKind | null; errorMessage: string | null };

const MESSAGES: Record<BodyScanActionKind, string> = {
  confirm: "Could not save this review. Nothing was changed.",
  reprocess: "Could not re-read this report. Your scan is unchanged.",
  delete: "Could not delete this scan. Please try again.",
};

const NOT_CONFIRMABLE_MESSAGE =
  "This scan is no longer awaiting review. Open it again to see its current state.";
const UNACKNOWLEDGED_MESSAGE =
  "Check the highlighted values against your report before saving.";

/**
 * Mutations for a single scan. Every action is explicit and user-initiated: nothing here
 * runs on its own, and a low-confidence review is never auto-confirmed.
 */
export function useBodyScanActions(scanId: string) {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<ActionState>({ pending: null, errorMessage: null });
  const idempotencyKeys = useRef(new Map<BodyScanActionKind, string>());

  const idempotencyKeyFor = useCallback((kind: BodyScanActionKind) => {
    const existing = idempotencyKeys.current.get(kind);
    if (existing) return existing;
    const key = `${kind}-${scanId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    idempotencyKeys.current.set(kind, key);
    return key;
  }, [scanId]);

  const run = useCallback(
    async (
      kind: BodyScanActionKind,
      call: (token: string, idempotencyKey: string) => Promise<{ ok: boolean; status?: number }>,
    ): Promise<BodyScanActionOutcome> => {
      setState({ pending: kind, errorMessage: null });
      const token = await getIdToken(false);
      if (!token) {
        const message = MESSAGES[kind];
        setState({ pending: null, errorMessage: message });
        return { ok: false, kind, message };
      }

      const res = await call(token, idempotencyKeyFor(kind));
      if (res.ok) {
        idempotencyKeys.current.delete(kind);
        setState({ pending: null, errorMessage: null });
        return { ok: true, kind };
      }

      const message =
        res.status === 409
          ? NOT_CONFIRMABLE_MESSAGE
          : res.status === 422
            ? UNACKNOWLEDGED_MESSAGE
            : MESSAGES[kind];
      setState({ pending: null, errorMessage: message });
      return { ok: false, kind, message };
    },
    [getIdToken, idempotencyKeyFor],
  );

  const confirm = useCallback(
    (body: BodyScanConfirmRequestDto) =>
      run("confirm", (token, idempotencyKey) =>
        confirmBodyScan(token, scanId, body, { idempotencyKey }),
      ),
    [run, scanId],
  );

  const reprocess = useCallback(
    () =>
      run("reprocess", (token, idempotencyKey) =>
        reprocessBodyScan(token, scanId, { idempotencyKey }),
      ),
    [run, scanId],
  );

  const remove = useCallback(async () => {
    const outcome = await run("delete", (token) => deleteBodyScan(token, scanId));
    // Scan id and document id are the same record, so the document lists invalidate too.
    if (outcome.ok) {
      markDocumentDeleted(scanId);
      // B-3E-CACHE-01: drop any local original preview after authoritative server delete.
      if (user?.uid) {
        await clearBodyScanOriginalCacheForDocument({
          userId: user.uid,
          documentId: scanId,
        }).catch(() => undefined);
      }
    }
    return outcome;
  }, [run, scanId, user?.uid]);

  const clearError = useCallback(() => {
    setState((prev) => (prev.errorMessage == null ? prev : { ...prev, errorMessage: null }));
  }, []);

  return useMemo(
    () => ({
      pending: state.pending,
      errorMessage: state.errorMessage,
      confirm,
      reprocess,
      remove,
      clearError,
    }),
    [clearError, confirm, remove, reprocess, state.errorMessage, state.pending],
  );
}
