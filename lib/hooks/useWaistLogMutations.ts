import { useCallback, useMemo, useState } from "react";

import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { logWaist } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { buildManualWaistCircumferencePayload } from "@/lib/events/manualBodyComposition";
import { emitRefresh } from "@/lib/navigation/refreshBus";

export type WaistLogMutationResult = { ok: true } | { ok: false; message: string };

/**
 * Waist edit/delete: create-new + delete previous (mirrors weight log mutations).
 * Deletes are account-scoped via deleteIngestedRawEventAuthed.
 */
export function useWaistLogMutations() {
  const { getIdToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const reset = useCallback(() => {
    setErrorMessage(null);
    setIsBusy(false);
  }, []);

  const deleteEntry = useCallback(
    async (rawEventId: string): Promise<WaistLogMutationResult> => {
      setIsBusy(true);
      setErrorMessage(null);
      try {
        const token = await getIdToken(false);
        if (!token) return { ok: false, message: "No auth token" };
        const res = await deleteIngestedRawEventAuthed(rawEventId, token);
        if (!res.ok) {
          const message = res.error ?? "Could not remove entry";
          setErrorMessage(message);
          return { ok: false, message };
        }
        emitRefresh("commandCenter", `${Date.now()}`);
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setErrorMessage(message);
        return { ok: false, message };
      } finally {
        setIsBusy(false);
      }
    },
    [getIdToken],
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
        if (!token) return { ok: false, message: "No auth token" };
        const payload = buildManualWaistCircumferencePayload({
          time: args.observedAtIso,
          timezone: args.timezone,
          waistCircumferenceCm: args.waistCircumferenceCm,
        });
        const created = await logWaist(payload, token);
        if (!created.ok) {
          setErrorMessage(created.error);
          return { ok: false, message: created.error };
        }
        const deleted = await deleteIngestedRawEventAuthed(args.rawEventId, token);
        if (!deleted.ok) {
          const message =
            deleted.error ?? "Updated waist but could not remove the previous entry";
          setErrorMessage(message);
          return { ok: false, message };
        }
        emitRefresh("commandCenter", `${Date.now()}`);
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setErrorMessage(message);
        return { ok: false, message };
      } finally {
        setIsBusy(false);
      }
    },
    [getIdToken],
  );

  return useMemo(
    () => ({
      deleteEntry,
      updateEntry,
      errorMessage,
      isBusy,
      reset,
    }),
    [deleteEntry, updateEntry, errorMessage, isBusy, reset],
  );
}
