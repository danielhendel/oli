import { useCallback, useMemo, useRef, useState } from "react";

import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { logWaist } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildManualWaistCircumferencePayload,
  manualWaistCorrectionIdempotencyKey,
} from "@/lib/events/manualBodyComposition";
import { emitRefresh } from "@/lib/navigation/refreshBus";

export type WaistLogMutationResult =
  | { ok: true; status: "success" | "retry_converged" }
  | {
      ok: false;
      status: "create_failed" | "replacement_saved_cleanup_pending";
      message: string;
    };

type PendingCleanup = {
  priorRawEventId: string;
  observedAtIso: string;
  waistCircumferenceCm: number;
  timezone: string;
  idempotencyKey: string;
};

/**
 * Waist edit/delete: create durable replacement first, then delete prior.
 * Retries reuse a stable correction idempotency key (includes prior event id).
 */
export function useWaistLogMutations() {
  const { getIdToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [cleanupPending, setCleanupPending] = useState(false);
  const pendingRef = useRef<PendingCleanup | null>(null);

  const reset = useCallback(() => {
    setErrorMessage(null);
    setIsBusy(false);
    setCleanupPending(false);
    pendingRef.current = null;
  }, []);

  const deleteEntry = useCallback(
    async (rawEventId: string): Promise<WaistLogMutationResult> => {
      setIsBusy(true);
      setErrorMessage(null);
      try {
        const token = await getIdToken(false);
        if (!token) {
          return {
            ok: false,
            status: "create_failed",
            message: "No auth token",
          };
        }
        const res = await deleteIngestedRawEventAuthed(rawEventId, token);
        if (!res.ok) {
          const message = res.error ?? "Could not remove entry";
          setErrorMessage(message);
          return { ok: false, status: "create_failed", message };
        }
        emitRefresh("commandCenter", `${Date.now()}`);
        return { ok: true, status: "success" };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setErrorMessage(message);
        return { ok: false, status: "create_failed", message };
      } finally {
        setIsBusy(false);
      }
    },
    [getIdToken],
  );

  const finishCleanup = useCallback(
    async (
      token: string,
      pending: PendingCleanup,
      afterRetry: boolean,
    ): Promise<WaistLogMutationResult> => {
      const deleted = await deleteIngestedRawEventAuthed(pending.priorRawEventId, token);
      if (!deleted.ok) {
        const message =
          "Corrected measurement was saved, but the previous entry could not be removed. Tap Retry cleanup.";
        setErrorMessage(message);
        setCleanupPending(true);
        pendingRef.current = pending;
        return { ok: false, status: "replacement_saved_cleanup_pending", message };
      }
      pendingRef.current = null;
      setCleanupPending(false);
      setErrorMessage(null);
      emitRefresh("commandCenter", `${Date.now()}`);
      return { ok: true, status: afterRetry ? "retry_converged" : "success" };
    },
    [],
  );

  const updateEntry = useCallback(
    async (args: {
      rawEventId: string;
      observedAtIso: string;
      waistCircumferenceCm: number;
      timezone: string;
    }): Promise<WaistLogMutationResult> => {
      setIsBusy(true);
      setErrorMessage(null);
      try {
        const token = await getIdToken(false);
        if (!token) {
          return {
            ok: false,
            status: "create_failed",
            message: "No auth token",
          };
        }

        const idempotencyKey = manualWaistCorrectionIdempotencyKey({
          priorRawEventId: args.rawEventId,
          time: args.observedAtIso,
          timezone: args.timezone,
          waistCircumferenceCm: args.waistCircumferenceCm,
        });

        const pendingMatch =
          pendingRef.current != null &&
          pendingRef.current.priorRawEventId === args.rawEventId &&
          pendingRef.current.idempotencyKey === idempotencyKey;

        if (pendingMatch && pendingRef.current) {
          return await finishCleanup(token, pendingRef.current, true);
        }

        const payload = buildManualWaistCircumferencePayload({
          time: args.observedAtIso,
          timezone: args.timezone,
          waistCircumferenceCm: args.waistCircumferenceCm,
        });
        const created = await logWaist(payload, token, {
          idempotencyKey,
          correctionOfRawEventId: args.rawEventId,
        });
        if (!created.ok) {
          setErrorMessage(created.error);
          return { ok: false, status: "create_failed", message: created.error };
        }

        const pending: PendingCleanup = {
          priorRawEventId: args.rawEventId,
          observedAtIso: args.observedAtIso,
          waistCircumferenceCm: args.waistCircumferenceCm,
          timezone: args.timezone,
          idempotencyKey,
        };
        return await finishCleanup(token, pending, false);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setErrorMessage(message);
        return { ok: false, status: "create_failed", message };
      } finally {
        setIsBusy(false);
      }
    },
    [getIdToken, finishCleanup],
  );

  /** Retry prior-event deletion after replacement was already saved. */
  const retryCleanup = useCallback(async (): Promise<WaistLogMutationResult> => {
    const pending = pendingRef.current;
    if (!pending) {
      return { ok: true, status: "retry_converged" };
    }
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken(false);
      if (!token) {
        return {
          ok: false,
          status: "replacement_saved_cleanup_pending",
          message: "No auth token",
        };
      }
      // Re-assert replacement with same idempotency key, then delete prior.
      const payload = buildManualWaistCircumferencePayload({
        time: pending.observedAtIso,
        timezone: pending.timezone,
        waistCircumferenceCm: pending.waistCircumferenceCm,
      });
      const created = await logWaist(payload, token, {
        idempotencyKey: pending.idempotencyKey,
        correctionOfRawEventId: pending.priorRawEventId,
      });
      if (!created.ok) {
        const message =
          "Corrected measurement was saved earlier, but cleanup could not continue. Try again.";
        setErrorMessage(message);
        setCleanupPending(true);
        return { ok: false, status: "replacement_saved_cleanup_pending", message };
      }
      return await finishCleanup(token, pending, true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setErrorMessage(message);
      setCleanupPending(true);
      return { ok: false, status: "replacement_saved_cleanup_pending", message };
    } finally {
      setIsBusy(false);
    }
  }, [getIdToken, finishCleanup]);

  return useMemo(
    () => ({
      deleteEntry,
      updateEntry,
      retryCleanup,
      errorMessage,
      isBusy,
      cleanupPending,
      reset,
    }),
    [deleteEntry, updateEntry, retryCleanup, errorMessage, isBusy, cleanupPending, reset],
  );
}
