// lib/data/body-scans/useBodyScanActions.ts
import { useCallback, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { confirmBodyScan, deleteBodyScan, reprocessBodyScan } from "@/lib/api/bodyScans";
import type { BodyScanConfirmRequestDto } from "@/lib/contracts";
import { clearBodyScanOriginalCacheForDocument } from "@/lib/data/body-scans/bodyScanOriginalCache";
import {
  emitBodyScanRuntimeDevStatus,
  httpStatusToDevBucket,
} from "@/lib/data/body-scans/bodyScanRuntimeDevStatus";
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

  const idempotencyKeyFor = useCallback(
    (kind: BodyScanActionKind) => {
      const existing = idempotencyKeys.current.get(kind);
      if (existing) return existing;
      const key = `${kind}-${scanId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      idempotencyKeys.current.set(kind, key);
      return key;
    },
    [scanId],
  );

  const run = useCallback(
    async (
      kind: BodyScanActionKind,
      call: (token: string, idempotencyKey: string) => Promise<{ ok: boolean; status?: number }>,
    ): Promise<BodyScanActionOutcome> => {
      setState({ pending: kind, errorMessage: null });
      if (kind === "reprocess") {
        emitBodyScanRuntimeDevStatus({
          operation: "reprocess",
          stage: "handler_enter",
          status: "started",
          hasScanId: scanId.length > 0,
        });
      }
      const token = await getIdToken(false);
      if (!token) {
        const message = MESSAGES[kind];
        setState({ pending: null, errorMessage: message });
        if (kind === "reprocess") {
          emitBodyScanRuntimeDevStatus({
            operation: "reprocess",
            stage: "early_return",
            status: "failed",
            safeReasonCode: "missing_auth",
            hasScanId: scanId.length > 0,
          });
        }
        return { ok: false, kind, message };
      }
      if (kind === "reprocess" && scanId.length === 0) {
        const message = MESSAGES[kind];
        setState({ pending: null, errorMessage: message });
        emitBodyScanRuntimeDevStatus({
          operation: "reprocess",
          stage: "early_return",
          status: "failed",
          safeReasonCode: "missing_scan_id",
          hasScanId: false,
        });
        return { ok: false, kind, message };
      }

      if (kind === "reprocess") {
        // Always mint a fresh key so a timed-out prior attempt cannot idempotent-replay
        // an old unsupported extraction without re-running ingestion.
        idempotencyKeys.current.delete("reprocess");
        emitBodyScanRuntimeDevStatus({
          operation: "reprocess",
          stage: "request_start",
          status: "started",
          hasScanId: true,
        });
      }

      const res = await call(token, idempotencyKeyFor(kind));
      if (kind === "reprocess") {
        emitBodyScanRuntimeDevStatus({
          operation: "reprocess",
          stage: "response",
          status: res.ok ? "ok" : "failed",
          httpBucket: httpStatusToDevBucket(res.status),
          hasScanId: true,
          ...(res.ok
            ? {}
            : {
                safeReasonCode:
                  res.status === 409
                    ? "not_retryable"
                    : res.status && res.status > 0
                      ? "http_failed"
                      : "network_failed",
              }),
        });
      }
      if (res.ok) {
        idempotencyKeys.current.delete(kind);
        setState({ pending: null, errorMessage: null });
        return { ok: true, kind };
      }

      // Drop failed reprocess keys so the next tap cannot silently replay a stale job.
      if (kind === "reprocess") {
        idempotencyKeys.current.delete("reprocess");
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
    [getIdToken, idempotencyKeyFor, scanId],
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
